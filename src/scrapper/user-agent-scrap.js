import scraper from "scraperjs";
import promisify from "es6-promisify";
import fs from "fs";
import path from "path";

const writeFile = promisify(fs.writeFile);

const output = path.resolve(__dirname, "user-agents.json");

function scrap(){
    return new Promise((resolve, fail) => {
        scraper.StaticScraper.create()
            .get({
                url: "https://techblog.willshouse.com/2012/01/03/most-common-user-agents/",
                header: {
                    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/601.4.4 (KHTML, like Gecko) Version/9.0.3 Safari/601.4.4"
                }
            })
            .scrape($ => {
                const table = $("table.most-common-user-agents");
                const headers = table
                    .find("thead tr th")
                    .map((i, th) => $(th).text())
                    .toArray();
                const rows = table
                    .find("tbody tr")
                    .map((tri, tr) => {
                        const tds = $(tr).find("td").map((i, td) => $(td).text());
                        return headers.reduce((result, prop, i) => {
                           result[prop] = tds[i];
                           return result;
                       }, {});
                    })
                    .toArray();
                return rows
            }).then(resolve, fail);
    });
}

scrap().then(results => writeFile(output, JSON.stringify(results, null, 2)))
       .catch(console.error);
