import https from "https";
import fs from "fs";
import path from "path";
import color from "colors-cli/safe";

const username = 'wcjiang'; // 替换为你的 npm 用户名
const dataPath = 'data/data.json';
const packageDir = 'data/package';

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
    const url = `https://api.npmjs.org/downloads/range/last-month/${packageName}`;
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

      for (const pkg of packages) {
        const downloads = await getPackageDownloads(pkg.name);
        const packageName = pkg.name.replace(/\//g, '_'); // 替换斜杠
        const packagePath = path.join(packageDir, `${packageName}.json`);
        fs.writeFileSync(packagePath, JSON.stringify(downloads, null, 2));
        console.log(color.green(`下载量数据已保存到 ${packagePath}`));
      }
    } else {
      console.log(color.yellow(`未找到用户 "${username}" 的任何包。`));
    }
  } catch (error) {
    console.error(color.red(error));
  }
}

main();