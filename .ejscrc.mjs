import fs from "fs-extra";

const downloads = fs.readJsonSync("data/package-stats.json");
const packages = fs.readJsonSync("data/data.json");
const downloadDates = Object.keys(downloads.dailyDownloads);

const currentTime = new Date().toISOString().replace('T', ' ').split('.')[0];
let mdString = fs.readFileSync("README.md", "utf8").replace(/<!--GAMFC-->.*?<!--GAMFC-END-->/, `<!--GAMFC-->${currentTime}<!--GAMFC-END-->`);;
fs.writeFileSync("README.md", mdString);

export default {
  data: {
    "templates/index.ejs": {
      packages: [...packages],
      downloads: downloads,
      firstDate: downloadDates[0],
      lastDate: downloadDates[downloadDates.length - 1],
    }
  },
};