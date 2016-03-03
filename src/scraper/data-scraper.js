import scraper from "scraperjs";
import bibtex from "bibtex-parse-js";
import promisify from "es6-promisify";
import fs from "fs";
import bibtexFormat from "../bibtex-format-str";
import common from "../common.js";
import packageJson from "../../package.json";
import program from "commander";
import _mkdirp from "mkdirp"
import path from "path";
import userAgents from "./user-agents.json";
import deepEqual from "deep-equal";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdirp = promisify(_mkdirp);
const scrapingLocation = common.scrapingLocation;
const cacheLocation = common.scrapingCacheLocation;
const delayInterval = [180000, 240000];

// Parse command line arguments.
program.version(packageJson.version).parse(process.argv);
const refsBibtexFile = program.args[0];
if(!refsBibtexFile) throw new Error("Bibtex path is required");

// Returns a random number between min (inclusive) and max (exclusive)
function getRandomInt(...interval) {
    const max = Math.max(...interval);
    const min = Math.min(...interval);
    return Math.round(Math.random() * (max - min) + min);
}

const wait = (delay, returnValue) => new Promise(
    resolve => setTimeout(() => resolve(returnValue), delay)
);

function scrapeRef(request){
    const addr = `https://scholar.google.com.sg/scholar?hl=en&q=${request}`;
    // Fetch a random user agent from the list.
    const userAgent = userAgents[getRandomInt(0, userAgents.length - 1)].useragent;
    const scraperPromise = scraper.StaticScraper.create()
        .get({
            url: `https://scholar.google.com.sg/scholar?hl=en&q=${request}`,
            headers: {
                'User-Agent': userAgent
            }
        })
        .scrape($ => {
            const results = $("#gs_ccl .gs_r");
            const firstResult = results.first();
            const titleLink = firstResult.find(".gs_rt a");
            const title = titleLink.text();
            const link = titleLink.attr("href");
            const citedByText = firstResult.find(".gs_ri .gs_fl a").first().text();
            const citedByMatch = citedByText.match(/Cited by (\d+)/);
            const citedBy = citedByMatch ? parseInt(citedByMatch[1], 10) : undefined;
            const blocked = $("form").first().attr('action') === "CaptchaRedirect";
            const authorsStr = firstResult.find(".gs_a").text().split(" - ")[0]
            const authors = authorsStr.split(",").map(a => a.trim());
            return { title, citedBy, authors, link, reqAddr: addr, blocked };
        });
    // Transform scraperjs's promise into a standard promise.
    return new Promise((resolve, fail) => scraperPromise.then(resolve, fail));
}

function getRequestStr(bibEntry){
    const doi = bibEntry.entryTags.doi ? bibtexFormat(bibEntry.entryTags.doi) : null;
    if(doi && !doi.startsWith("http") && !doi.startsWith("www")){
        return doi;
    } else {
        const firstAuthor = bibtexFormat(bibEntry.entryTags.author)
            .split("and")[0]
            .split(",")[0]
            .trim();
        const title = bibtexFormat(bibEntry.entryTags.title);
        return firstAuthor + ` "${title}"`;
    }
}

// Scrap a whole bibtex file. Request are sent sequentially and  a random
// delay is introduced between request.
function scrapBibtex(bib){
    const results = [];
    const n = bib.length;
    if(n < 1){ return Promise.resolve(results); }
    const delays = new Array(n - 1).fill(null).map(() => getRandomInt(...delayInterval));
    const duration = delays.reduce((a, b) => a+b, 0);
    if(n > 1){
        process.stdout.write(`Scraping will last ~${ Math.round(duration/1000) }s ` +
            "(requests are spaced out to avoid being blocked).\n");
    }
    return bib.reduce((promise, bibEntry, i) => {
        if(i > 0) {
            promise = promise.then(() => {
                const delay = delays.pop();
                process.stdout.write(`Waiting ${delay}ms...\n`);
                return wait(delay);
            });
        }
        promise = promise
            .then(() => {
                process.stdout.write(`Scraping ${bibEntry.citationKey} (${ i+1 }/${ n }).\n`);
                return scrapeRef(getRequestStr(bibEntry));
            })
            .then(gsResult => {
                if(gsResult.blocked){
                    process.stdout.write("    Scraping blocked...\n");
                }
                results.push({ bibEntry, gsResult })
            });
        return promise;
    }, Promise.resolve()).then(() => results);
}

mkdirp(path.dirname(scrapingLocation))
    .then(() => Promise.all([
        readFile(refsBibtexFile)
            .then(buffer => bibtex.toJSON(buffer.toString())),
        readFile(cacheLocation)
            .then(cacheBuffer => JSON.parse(cacheBuffer.toString()))
            .catch(() => ({}))
    ]))
    .then(([bibEntries, cache]) => {
        const cachedEntries = [];
        const toScrap = [];
        for(const entry of bibEntries){
            const cachedEntry = cache[entry.citationKey];
            if(cachedEntry && deepEqual(cachedEntry.bibEntry, entry)){
                cachedEntries.push(cachedEntry)
            } else {
                toScrap.push(entry);
            }
        }
        return Promise.all([cachedEntries, scrapBibtex(toScrap), cache]);
    })
    .then(([cachedEntries, scrapedEntries, cache]) => {
        const entries = cachedEntries
            .concat(scrapedEntries)
            .sort((e1, e2) => e1.bibEntry.citationKey.localeCompare(e2.bibEntry.citationKey));
        for(const scrapedEntry of scrapedEntries.filter(e => !e.gsResult.blocked)){
            cache[scrapedEntry.bibEntry.citationKey] = scrapedEntry;
        }
        return Promise.all([
            writeFile(scrapingLocation, JSON.stringify(entries, null, 2)),
            writeFile(cacheLocation, JSON.stringify(cache, null, 2))
        ]);
    })
    .catch(err => process.stderr.write(err.stack ? err.stack.toString() : err.toString()));
