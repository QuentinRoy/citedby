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
const minDelay = 30000;
const maxDelay = 60000;
const scrapingLocation = common.scrapingLocation;

// Parse command line arguments.
program.version(packageJson.version).parse(process.argv);
const refsBibtexFile = program.args[0];
if(!refsBibtexFile) throw new Error("Bibtex path is required");

// Returns a random number between min (inclusive) and max (exclusive)
function getRandomInt(min, max) {
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

// Scrap a whole bibtex file. Request are sent sequentially and  a random
// delay is introduced between request.
function scrapBibtex(bibtexStr){
    const bib = bibtex.toJSON(bibtexStr);
    const results = [];
    const n = bib.length;
    const delays = new Array(n - 1).fill(null).map(() => getRandomInt(minDelay, maxDelay));
    const duration = delays.reduce((a, b) => a+b);
    process.stdout.write(`Scraping will last ~${duration/1000}s (requests are spaced out to avoid being blocked).`);
    return bib.reduce((promise, bibEntry, i) => {
        const req = bibtexFormat(bibEntry.entryTags.doi ? bibEntry.entryTags.doi
                                                        : bibEntry.entryTags.title);
        if(i > 0) {
            promise = promise.then(() => {
                const delay = delays.pop();
                process.stdout.write(`Waiting ${delay}ms...`)
                return wait(delay)
            });
        }
        promise = promise
            .then(() => {
                process.stdout.write(`Scraping ${bibEntry.citationKey} (${i+1}/${n}).`);
                return scrapeRef(req)
            })
            .then(gsResult => {
                if(gsResult.blocked){
                    process.stdout.write("    Scraping blocked...");
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
    .catch(process.stderr.write.bind(process.stderr));
