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
const delayInterval = [180000, 240000];
const scrapingLocation = common.scrapingLocation;

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

function wait(delay, returnValue){
    return new Promise(
        resolve => setTimeout(() => resolve(returnValue), delay)
    );
}

function scrapeRef(request){
    const addr = `https://scholar.google.com.sg/scholar?hl=en&q=${request}`;
    // Fetch a random user agent from the list.
    const userAgent = userAgents[getRandomInt(0, userAgents.length - 1)].useragent;
    const scraperPromise = scraper.StaticScraper.create()
        .get({
            url: `https://scholar.google.com.sg/scholar?hl=en&q=${request}`,
            // proxy: "http://31.214.144.178",
            tunnel : false,
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
function scrapBibtex(bibtexStr){
    const bib = bibtex.toJSON(bibtexStr);
    const results = [];
    const n = bib.length;
    const delays = new Array(n - 1).fill(null).map(() => getRandomInt(...delayInterval));
    const duration = delays.reduce((a, b) => a+b);
    process.stdout.write(`Scraping will last ~${Math.round(duration/1000)}s (requests are spaced out to avoid being blocked).`+ '\n');
    return bib.reduce((promise, bibEntry, i) => {
        if(i > 0) {
            promise = promise.then(() => {
                const delay = delays.pop();
                process.stdout.write(`Waiting ${delay}ms...`+ '\n')
                return wait(delay)
            });
        }
        promise = promise
            .then(() => {
                process.stdout.write(`Scraping ${bibEntry.citationKey} (${i+1}/${n}).`+ '\n');
                return scrapeRef(getRequestStr(bibEntry));
            })
            .then(gsResult => {
                if(gsResult.blocked){
                    process.stdout.write("    Scraping blocked..."+ '\n');
                }
                results.push({ bibEntry, gsResult })
            });
        return promise;
    }, Promise.resolve()).then(() => results);
}

// Return a promise factory for f whose resulting value will always be the value with
// which it has been called.
const nonFilteringPromise = f => result => Promise.resolve(result).then(f).then(() => result);

readFile(refsBibtexFile)
    .then(buffer => scrapBibtex(buffer.toString()))
    // This promise is non filtering meaning that its resolving value will be the
    // the resolving value of the preceding one.
    .then(nonFilteringPromise(() => mkdirp(path.dirname(scrapingLocation))))
    .then(results => writeFile(scrapingLocation, JSON.stringify(results, null, 2)))
    .catch(...args => process.stdout.write(...args));
