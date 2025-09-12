/**
 * X.com 推文爬取服务
 * 使用 Puppeteer 爬取指定列表的推文数据并存储到 Supabase
 */

// 加载环境变量
require("dotenv").config();

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { storeTweetsToSupabase } = require("../lib/database");

// 配置常量
const CONFIG = {
  CHROME_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  COOKIES_FILE: "../cookies.json",
  DEFAULT_MAX_SCROLLS: 100,
  SCROLL_TIMEOUT: 20000,
  NO_NEW_TWEETS_LIMIT: 5,
  RANDOM_SCROLL_MIN: 300,
  RANDOM_SCROLL_MAX: 600,
  WAIT_TIME_MIN: 1500,
  WAIT_TIME_MAX: 2500,
};

/**
 * 爬取 X.com 列表推文数据
 * @param {string} listId - X.com 列表 ID
 * @param {number} maxScrolls - 最大滚动次数，默认 100
 * @returns {Promise<Array>} 推文数据数组
 */
async function scrapeXListWithLogin(
  listId,
  maxScrolls = CONFIG.DEFAULT_MAX_SCROLLS
) {
  if (!listId) {
    throw new Error("列表 ID 不能为空");
  }

  const url = `https://x.com/i/lists/${listId}`;
  console.log(`开始爬取列表: ${listId}`);

  // 启动浏览器
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: CONFIG.CHROME_PATH,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--window-size=1920,1080",
      "--start-maximized",
      "--disable-notifications",
      "--disable-extensions",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  const page = await browser.newPage();

  // 设置更真实的 User-Agent
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
  );

  // 模拟真实用户行为
  await page.setExtraHTTPHeaders({
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "sec-ch-ua":
      '"Google Chrome";v="135", "Chromium";v="135", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  });

  // 加载并设置 cookies
  try {
    const cookiesPath = path.resolve(__dirname, CONFIG.COOKIES_FILE);
    if (!fs.existsSync(cookiesPath)) {
      throw new Error("未找到 cookies.json，请先导出 X 登录 cookie");
    }

    const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));
    const cookiesWithDomain = cookies.map((cookie) => ({
      ...cookie,
      domain: ".x.com",
      path: "/",
      secure: true,
      sameSite: "None",
    }));

    await page.setCookie(...cookiesWithDomain);
    console.log("Cookies 设置成功");
  } catch (error) {
    await browser.close();
    throw new Error(`Cookies 设置失败: ${error.message}`);
  }

  console.log(`正在打开 ${url} ...`);
  await page.goto(url, { waitUntil: "networkidle2" });

  // 等待推文加载
  try {
    await page.waitForSelector('article [data-testid="tweetText"]', {
      timeout: CONFIG.SCROLL_TIMEOUT,
    });
    console.log("推文列表加载成功");
  } catch (error) {
    await browser.close();
    throw new Error("推文列表加载超时，请检查列表 ID 或网络连接");
  }

  // 滚动并收集所有推文
  let collected = [];
  let previousLength = 0;
  let noNewTweetsCount = 0;
  let scrollCount = 0;

  console.log("开始收集推文...");

  while (scrollCount < maxScrolls) {
    // 获取当前页面上的所有推文

    const tweets = await page.$$eval("article", (nodes) =>
      nodes.map((article) => {
        const textNode = article.querySelector('[data-testid="tweetText"]');
        const linkNode = article.querySelector('a[href*="/status/"]');
        return {
          content: textNode ? textNode.innerText.trim() : "",
          url: linkNode ? linkNode.href : "",
        };
      })
    );
    // 合并并去重
    collected = [...new Set([...collected, ...tweets])];

    console.log(`当前已收集 ${collected.length} 条推文`);

    // 检查是否有新推文被添加
    if (collected.length === previousLength) {
      noNewTweetsCount++;

      // 如果连续多次滚动都没有新推文，可能已经到底部了
      if (noNewTweetsCount >= CONFIG.NO_NEW_TWEETS_LIMIT) {
        console.log(
          `连续${CONFIG.NO_NEW_TWEETS_LIMIT}次滚动没有发现新推文，可能已到达列表底部`
        );
        break;
      }
    } else {
      // 重置计数器
      noNewTweetsCount = 0;
      previousLength = collected.length;
    }

    // 模拟真实的滚动行为
    await page.evaluate(
      (min, max) => {
        const scrollHeight = Math.floor(Math.random() * (max - min)) + min;
        window.scrollBy(0, scrollHeight);
      },
      CONFIG.RANDOM_SCROLL_MIN,
      CONFIG.RANDOM_SCROLL_MAX
    );

    // 随机等待时间，模拟人类行为
    const randomWait =
      Math.floor(
        Math.random() * (CONFIG.WAIT_TIME_MAX - CONFIG.WAIT_TIME_MIN)
      ) + CONFIG.WAIT_TIME_MIN;
    await page.evaluate((wait) => {
      return new Promise((resolve) => setTimeout(resolve, wait));
    }, randomWait);

    scrollCount++;
  }

  // 关闭浏览器
  await browser.close();
  console.log(`爬取完成，共获取 ${collected.length} 条推文`);

  // 存储推文数据到数据库
  if (collected.length > 0) {
    try {
      console.log("开始将推文数据存储到数据库...");

      const formattedTweets = collected.map((tweet) => ({
        content: tweet.content,
        url: tweet.url,
        created_at: new Date().toISOString(),
        list_id: listId,
      }));

      await storeTweetsToSupabase(formattedTweets);
      console.log(`成功将 ${collected.length} 条推文存储到数据库`);
    } catch (error) {
      console.error("推文入库失败:", error.message);
      throw error;
    }
  } else {
    console.log("未获取到推文数据");
  }

  return collected;
}

/**
 * 主函数 - 执行推文爬取任务
 */
async function main() {
  const listId = "1950374938378113192"; // 默认列表 ID
  const maxScrolls = 5; // 测试用较小的滚动次数

  try {
    console.log("=== X.com 推文爬取服务启动 ===");
    const tweets = await scrapeXListWithLogin(listId, maxScrolls);
    console.log("=== 爬取任务完成 ===");
    console.log(`总计获取推文: ${tweets.length} 条`);
  } catch (error) {
    console.error("=== 爬取任务失败 ===");
    console.error("错误信息:", error.message);
    process.exit(1);
  }
}

// 导出函数供其他模块使用
module.exports = {
  scrapeXListWithLogin,
};

// 如果直接运行此文件，则执行主函数
if (require.main === module) {
  main();
}
