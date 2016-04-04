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
            return {
                title, citedBy, authors, link, blocked, request,
                reqAddr: addr,
                scrapDate: Date.now()
            };
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

// Wrap a Promise.then arguments so that it does not filter the given result.
const forwardingThen = (f) => (result) => Promise.resolve(result).then(f).then(() => result);

// Make sure the directories exists
mkdirp(path.dirname(scrapingLocation))
    // Read the target bibtex file and the cache
    .then(() => Promise.all([
        readFile(refsBibtexFile)
            .then(buffer => bibtex.toJSON(buffer.toString())),
        readFile(cacheLocation)
            .then(cacheBuffer => JSON.parse(cacheBuffer.toString()))
            .catch(() => ({}))
    ]))
    // Retrieve the entries existing in the cache and scrap the others.
    .then(([bibEntries, cache]) => {
        // Make the scraping start ascynchrone
        let promiseQueue = wait(0);
        const n = bibEntries.length;
        let cachedNb = 0;
        let scrappedNb = 0;
        return Promise.all(bibEntries.map((bibEntry) => {
            const reqStr = getRequestStr(bibEntry);
            const cachedResult = cache[reqStr];
            if(cachedResult){
                process.stdout.write(`Retrieve ${ bibEntry.citationKey } from cache.\n`);
                cachedNb++;
                // just return the cached result.
                return Promise.resolve({ gsResult: cachedResult, bibEntry });
            } else {
                return promiseQueue = promiseQueue
                    // Delay each scraping request to avoid being blocked.
                    .then(() => {
                        scrappedNb++;
                        if(scrappedNb > 1){
                            const delay = getRandomInt(...delayInterval);
                            process.stdout.write(`Waiting for ${delay / 1000}s...\n`);
                            return wait(delay);
                        }
                    })
                    // Scrap.
                    .then(() => {
                        process.stdout.write(`Scrap ${ bibEntry.citationKey }` +
                            ` (${ scrappedNb }/${ n - cachedNb }).\n`);
                        return scrapeRef(getRequestStr(bibEntry));
                    })
                    // Update the cache.
                    .then(forwardingThen((gsResult) => {
                        if(!gsResult.blocked){
                            cache[gsResult.request] = gsResult;
                            return writeFile(cacheLocation, JSON.stringify(cache, null, 2));
                        }
                    }))
                    // Create the result.
                    .then(gsResult => ({ bibEntry, gsResult }));
            }
        }));
    })
    // Write the data file.
    .then((entries) => {
        entries.sort((e1, e2) => e1.bibEntry.citationKey.localeCompare(e2.bibEntry.citationKey));
        return writeFile(scrapingLocation, JSON.stringify(entries, null, 2));
    })
    .catch(err => process.stderr.write(err.stack ? err.stack.toString() : err.toString()));
