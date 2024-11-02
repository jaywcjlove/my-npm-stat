import https from "https";
import fs from "fs";
import path from "path";
import color from "colors-cli/safe";
import { format, startOfWeek, subYears } from "date-fns";

const username = 'wcjiang'; // 替换为你的 npm 用户名
const dataPath = 'data/data.json';
const packageDir = 'data/package';
const statsPath = 'data/package-stats.json';

function getPackages(from = 0, allPackages = []) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/-/v1/search?text=maintainer:${username}&size=250&from=${from}`;

    https.get(url, (res) => {
      let data = '';

      // 监听数据块
      res.on('data', (chunk) => {
        data += chunk;
      });

      // 响应结束
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const packages = json.objects.map(pkg => pkg.package); // 存储完整包数据
          
          // 合并当前包与之前的包
          allPackages = allPackages.concat(packages);

          // 如果当前包数量小于 250，表示没有更多数据，结束递归
          if (packages.length < 250) {
            resolve(allPackages);
          } else {
            // 递归调用以获取下一页
            resolve(getPackages(from + 250, allPackages));
          }
        } catch (error) {
          reject('Error parsing JSON: ' + error.message);
        }
      });
    }).on('error', (error) => {
      reject('Error fetching packages: ' + error.message);
    });
  });
}

function getPackageDownloads(packageName) {
  return new Promise((resolve, reject) => {
    const url = `https://api.npmjs.org/downloads/range/last-year/${packageName}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject('Error parsing JSON: ' + error.message);
        }
      });
    }).on('error', (error) => {
      reject('Error fetching downloads: ' + error.message);
    });
  });
}

function calculateStats(allDownloads) {
  const dailyDownloads = {};
  const weeklyDownloads = {};
  const monthlyDownloads = {};
  let totalDownloads = 0;

  const oneYearAgo = subYears(new Date(), 1);

  allDownloads.forEach(download => {
    const date = new Date(download.day);
    if (date >= oneYearAgo) {
      const year = date.getFullYear();
      const month = `${year}-${date.getMonth() + 1}`;
      const week = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-\'W\'II');
      const day = download.day;

      dailyDownloads[day] = (dailyDownloads[day] || 0) + download.downloads;
      weeklyDownloads[week] = (weeklyDownloads[week] || 0) + download.downloads;
      monthlyDownloads[month] = (monthlyDownloads[month] || 0) + download.downloads;
      totalDownloads += download.downloads;
    }
  });

  return {
    dailyDownloads,
    weeklyDownloads,
    monthlyDownloads,
    yearlyDownloads: totalDownloads, // 过去一年时间下载总和
    totalDownloads
  };
}

async function main() {
  try {
    const packages = await getPackages();
    console.log(color.green(`总共获取到 ${packages.length} 个包:`));
    if (packages.length > 0) {
      fs.writeFileSync(dataPath, JSON.stringify(packages, null, 2));
      console.log(color.green('完整数据已保存到 data.json'));

      if (!fs.existsSync(packageDir)) {
        fs.mkdirSync(packageDir, { recursive: true });
      }

      const allDownloads = [];
      const packageDownloads = {};

      for (const pkg of packages) {
        const downloads = await getPackageDownloads(pkg.name);
        const packageName = pkg.name.replace(/\//g, '_'); // 替换斜杠
        const packagePath = path.join(packageDir, `${packageName}.json`);
        fs.writeFileSync(packagePath, JSON.stringify(downloads, null, 2));
        console.log(color.green(`下载量数据已保存到 ${packagePath}`));

        if (Array.isArray(downloads.downloads)) {
          allDownloads.push(...downloads.downloads);
          packageDownloads[pkg.name] = downloads.downloads.reduce((acc, download) => acc + download.downloads, 0);
        } else {
          console.error(color.red(`Unexpected downloads structure for package ${pkg.name}`));
        }
      }
      
      const stats = calculateStats(allDownloads);
      stats.topPackages = Object.entries(packageDownloads)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([name, downloads]) => ({ name, downloads }));

      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
      console.log(color.green(`所有包的统计数据已保存到 ${statsPath}`));
    } else {
      console.log(color.yellow(`未找到用户 "${username}" 的任何包。`));
    }
  } catch (error) {
    console.error(color.red(error));
  }
}

main();