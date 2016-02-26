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

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdirp = promisify(_mkdirp);

program
    .version(packageJson.version)
    .option("-m, --mail [string]", "Your email")
    .parse(process.argv);


const scrappingLocation = common.scrappingLocation;
const refsBibtexFile = program.args[0];
const email = program.mail;

if(!refsBibtexFile) throw new Error("Bibtex path is required");

function scrapeRef(request){
    return new Promise((resolve, fail) => {
        const addr = `https://scholar.google.com.sg/scholar?hl=en&q=${request}`;
        // console.log(addr);
        scraper.StaticScraper.create()
            .get({
                url: `https://scholar.google.com.sg/scholar?hl=en&q=${request}`,
                header: {
                    'User-Agent': email ? `Collecting cited by count for my bibliography;${email}`
                                        : "Collecting cited by count for my bibliography"
                }
            })
            .scrape($ => {
                const results = $("#gs_ccl .gs_r");
                const firstResult = results.first();
                const title = firstResult.find(".gs_rt a").text();
                const citedByText = firstResult.find(".gs_ri .gs_fl a").first().text();
                const citedByMatch = citedByText.match(/Cited by (\d+)/);
                const citedBy = citedByMatch ? parseInt(citedByMatch[1], 10) : undefined;
                return { title, citedBy, reqAddr: addr };
            }).then(resolve, fail);
    });
}

function scrapBibtex(bibtexStr){
    const bib = bibtex.toJSON(bibtexStr);
    return Promise.all(bib.map(bibEntry => {
        const req = bibtexFormat(bibEntry.entryTags.doi ? bibEntry.entryTags.doi
                                                        : bibEntry.entryTags.title);
        return scrapeRef(req).then(gsResult => ({ bibEntry, gsResult }));
    }));
}

// Return a promise factory for f whose resulting value will always be the value with
// which it has been called.
const nonFilteringPromise = f => result => Promise.resolve(result).then(f).then(() => result);

readFile(refsBibtexFile)
    .then(buffer => scrapBibtex(buffer.toString()))
    // This promise is non filtering meaning that its resolving value will be the
    // the resolving value of the preceding one.
    .then(nonFilteringPromise(() => mkdirp(path.dirname(scrappingLocation))))
    .then(results => writeFile(scrappingLocation, JSON.stringify(results, null, 2)))
    .catch(console.error);
