import puppeteer from "puppeteer";
import { writeFileSync } from "fs";

let browser = await puppeteer.launch({
    headless: false,
    timeout: 60000,
    defaultViewport: null,
});
let page = await browser.newPage();
await page.goto("https://www.theca.org.uk/orcas/reports");

// open list
await page.waitForSelector(".blue-btn.rte-center");
await page.evaluate(`document.querySelector(".blue-btn.rte-center").click();`);

// get list items
await page.waitForSelector(".InfoPanelMap_SimpleMap:nth-of-type(4) .listitem");
let itemsLength = await page.evaluate(`document.querySelectorAll(".InfoPanelMap_SimpleMap:nth-of-type(4) .listitem").length`);
console.log(itemsLength)

// set up table
let out = {
    "report": new Array(itemsLength),
    "datetime": new Array(itemsLength),
    "coords": new Array(itemsLength),
};

let waitABit = (ms) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
};

await waitABit(1000); // dunno what to wait for?

// read each item
for (let i = 0; i < itemsLength; i++) {
    await page.evaluate(`
        document.querySelectorAll(".InfoPanelMap_SimpleMap:nth-of-type(4) .listitem")[${i}].click();
    `);
    waitABit(50); // so it doesn't find the wrong one
    await page.waitForSelector(".InfoPanelMap_Panel div:nth-of-type(2) p");
    let dataLength = (await page.evaluate(`document.querySelectorAll(".InfoPanelMap_Panel div:nth-of-type(2) p").length`) - 5) / 2;
    out["report"][i] = (await page.evaluate(`document.querySelectorAll(".InfoPanelMap_Panel div:nth-of-type(2) p")[2].innerText`)).replaceAll(",", "\\").replaceAll("\n", "\\");
    out["datetime"][i] = (await page.evaluate(`document.querySelectorAll(".InfoPanelMap_Panel div:nth-of-type(2) p")[3].innerText`)).replaceAll(",", "\\").replaceAll("\n", "\\");
    out["coords"][i] = (await page.evaluate(`document.querySelectorAll(".InfoPanelMap_Panel div:nth-of-type(2) p")[4].innerText`)).replaceAll(",", "\\").replaceAll("\n", "\\");
    for (let j = 0; j < dataLength; j ++) {
        let header = await page.evaluate(`document.querySelectorAll(".InfoPanelMap_Panel div:nth-of-type(2) p")[${j * 2 + 5}].innerText`);
        let value = await page.evaluate(`document.querySelectorAll(".InfoPanelMap_Panel div:nth-of-type(2) p")[${j * 2 + 6}].innerText`);
        // don't want to deal with multiple commas / line breaks
        header = header.replaceAll(",", "\\").replaceAll("\n", "\\");
        value = value.replaceAll(",", "\\").replaceAll("\n", "\\");
        if (!Object.keys(out).includes(header)) {
            out[header] = new Array(itemsLength);
        }
        out[header][i] = value;
    }
}

// create csv
let csv = ``;
csv += Object.keys(out).join(",");
csv += "\n";
for (let i = 0; i < itemsLength; i++) {
    for (let key in out) {
        csv += out[key][i] || "";
        csv += ",";
    }
    csv += "\n";
}

writeFileSync("./orcas.csv", csv);