import fs from "fs-extra";

const downloads = fs.readJsonSync("data/package-stats.json");
const packages = fs.readJsonSync("data/data.json");
const downloadDates = Object.keys(downloads.dailyDownloads);

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