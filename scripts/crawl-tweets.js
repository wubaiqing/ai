/**
 * X.com 推文爬取服务
 */
require("dotenv").config();

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { storeTweetDataToSupabase } = require("../src/data/database");
const { APPLICATION_CONFIG } = require("../src/lib/config.js");

const CONFIG = {
  CHROME_EXECUTABLE_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  COOKIES_FILE_PATH: "../cookies.json",
  DEFAULT_MAX_SCROLL_COUNT: 100,
  PAGE_LOAD_TIMEOUT: 60000,
  CONSECUTIVE_EMPTY_SCROLL_LIMIT: 5,
  SCROLL_HEIGHT: [300, 600],
  SCROLL_DELAY: [1500, 2500],
};

/**
 * 处理页面中的'Show more'按钮，点击展开完整推文内容
 * @param {Object} page - Puppeteer页面对象
 */
async function handleShowMoreButtons(page) {
  try {
    const clickResult = await page.evaluate(() => {
      let buttonsClicked = 0;
      const showMoreButtons = document.querySelectorAll(
        'article [data-testid="tweet-text-show-more-link"]'
      );

      showMoreButtons.forEach((button) => {
        const text = button.textContent?.trim();
        if (text && (text === "Show more" || text === "显示更多")) {
          // 阻止事件冒泡和默认行为
          button.addEventListener(
            "click",
            (e) => {
              e.stopPropagation();
              e.preventDefault();
            },
            { once: true, capture: true }
          );
          
          button.click();
          buttonsClicked++;
        }
      });

      return buttonsClicked;
    });

    if (clickResult > 0) {
      console.log(`成功点击 ${clickResult} 个Show more按钮`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.log(`处理Show more按钮时出错: ${error.message}`);
  }
}

/**
 * 爬取 X.com 列表推文数据
 * @param {string} listId - X.com 列表 ID
 * @param {number} maxScrolls - 最大滚动次数，默认 100
 * @returns {Promise<Array>} 推文数据数组
 */
async function scrapeTwitterListWithAuthentication(
  listId,
  maxScrollCount = CONFIG.DEFAULT_MAX_SCROLL_COUNT
) {
  if (!listId) {
    throw new Error("列表 ID 不能为空");
  }

  const targetUrl = `https://x.com/i/lists/${listId}`;
  console.log(`开始爬取推特列表: ${listId}`);

  const launchOptions = {
    headless: false,
    executablePath: CONFIG.CHROME_EXECUTABLE_PATH,
    defaultViewport: null,
    timeout: CONFIG.PAGE_LOAD_TIMEOUT,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1920,1080",
      "--start-maximized",
      "--disable-notifications",
      "--disable-extensions",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  };

  if (process.env.PROXY_HOST) {
    const proxyServer = `${process.env.PROXY_HOST}:${process.env.PROXY_PORT || "7890"}`;
    console.log(`使用代理: ${proxyServer}`);
    launchOptions.args.push(`--proxy-server=${proxyServer}`, "--ignore-certificate-errors");
  }

  console.log("启动浏览器...");
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(CONFIG.PAGE_LOAD_TIMEOUT);
    page.setDefaultNavigationTimeout(CONFIG.PAGE_LOAD_TIMEOUT);

    await page.setUserAgent(
      APPLICATION_CONFIG.getUserAgent()
    );

    await page.setRequestInterception(true);
    page.on("request", (request) => request.continue());

    const cookiesFilePath = path.resolve(__dirname, CONFIG.COOKIES_FILE_PATH);
    if (!fs.existsSync(cookiesFilePath)) {
      throw new Error("未找到 cookies.json，请先导出 X 登录 cookie");
    }

    const savedCookies = JSON.parse(fs.readFileSync(cookiesFilePath, "utf-8"));
    const formattedCookies = savedCookies.map((cookie) => ({
      ...cookie,
      domain: ".x.com",
      path: "/",
      secure: true,
      sameSite: "None",
    }));

    await page.setCookie(...formattedCookies);
    console.log("Cookies设置成功");

    console.log(`访问页面: ${targetUrl}`);
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: CONFIG.PAGE_LOAD_TIMEOUT,
    });

    // 处理cookie同意弹窗
    try {
      await page.waitForSelector('[data-testid="BottomBar"] [role="button"]', { timeout: 5000 });
      await page.evaluate(() => {
        const acceptButton = document.querySelector('[data-testid="BottomBar"] [role="button"]');
        if (acceptButton && acceptButton.textContent.includes('Accept')) {
          acceptButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
          }, { once: true, capture: true });
          acceptButton.click();
        }
      });
      console.log("已处理cookie同意弹窗");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log("未发现cookie弹窗或已处理");
    }

    await page.waitForSelector('article [data-testid="tweetText"]', {
      timeout: CONFIG.PAGE_LOAD_TIMEOUT,
    });
    console.log("页面加载成功");

    // 滚动页面并收集推文数据
    let collectedTweets = [];
    let previousTweetCount = 0;
    let consecutiveEmptyScrolls = 0;
    let currentScrollCount = 0;

    console.log("开始收集推文数据...");

    while (currentScrollCount < maxScrollCount) {
      // 处理Show more按钮
      await handleShowMoreButtons(page);

      // 获取当前页面上的所有推文
      const currentPageTweets = await page.$$eval("article", (articleNodes) =>
        articleNodes.map((articleElement) => {
          const tweetTextElement = articleElement.querySelector(
            '[data-testid="tweetText"]'
          );
          const tweetLinkElement = articleElement.querySelector(
            'a[href*="/status/"]'
          );

          const content = tweetTextElement
            ? tweetTextElement.innerText.trim()
            : "";
          const url = tweetLinkElement ? tweetLinkElement.href : "";

          return { content, url };
        })
      );

      // 过滤有效推文并去重
      const validNewTweets = currentPageTweets.filter(
        (tweet) =>
          tweet.url &&
          tweet.url.trim() !== "" &&
          tweet.content &&
          tweet.content.trim() !== ""
      );

      // 基于URL去重合并
      const allTweets = [...collectedTweets, ...validNewTweets];
      const uniqueTweetMap = new Map();

      allTweets.forEach((tweet) => {
        if (!uniqueTweetMap.has(tweet.url)) {
          uniqueTweetMap.set(tweet.url, tweet);
        }
      });

      collectedTweets = Array.from(uniqueTweetMap.values());
      console.log(`当前已收集 ${collectedTweets.length} 条推文`);

      // 检查是否有新推文
      if (collectedTweets.length === previousTweetCount) {
        consecutiveEmptyScrolls++;
        if (consecutiveEmptyScrolls >= CONFIG.CONSECUTIVE_EMPTY_SCROLL_LIMIT) {
          console.log(
            `连续${CONFIG.CONSECUTIVE_EMPTY_SCROLL_LIMIT}次滚动没有发现新推文，可能已到达列表底部`
          );
          break;
        }
      } else {
        consecutiveEmptyScrolls = 0;
        previousTweetCount = collectedTweets.length;
      }

      await page.evaluate((scrollRange) => {
        const [min, max] = scrollRange;
        const height = Math.floor(Math.random() * (max - min)) + min;
        window.scrollBy(0, height);
      }, CONFIG.SCROLL_HEIGHT);

      const [minDelay, maxDelay] = CONFIG.SCROLL_DELAY;
      const delay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
      await new Promise((resolve) => setTimeout(resolve, delay));

      currentScrollCount++;
    }

    console.log(`爬取完成，共获取 ${collectedTweets.length} 条推文`);

    if (collectedTweets.length > 0) {
      const databaseReadyTweets = collectedTweets.map((tweet) => ({
        content: tweet.content,
        url: tweet.url,
        created_at: new Date().toISOString(),
        list_id: listId,
      }));

      await storeTweetDataToSupabase(databaseReadyTweets);
      console.log(`成功存储 ${collectedTweets.length} 条推文到数据库`);
    } else {
      console.log("未获取到推文数据");
    }

    return collectedTweets;
  } catch (error) {
    console.error("爬取过程中发生错误:", error.message);
    throw error;
  } finally {
    // 确保浏览器被关闭
    await browser.close();
  }
}

async function executeTwitterScrapingTask() {
  const defaultListId = "1950374938378113192";
  const testScrollCount = 10;

  try {
    console.log("=== 推文爬取服务启动 ===");
    const scrapedTweets = await scrapeTwitterListWithAuthentication(defaultListId, testScrollCount);
    console.log("=== 爬取任务完成 ===");
    console.log(`总计获取: ${scrapedTweets.length} 条推文`);
  } catch (error) {
    console.error("=== 爬取任务失败 ===");
    console.error("错误:", error.message);
    process.exit(1);
  }
}

// 导出核心函数
module.exports = {
  scrapeTwitterListWithAuthentication,
};

// 如果直接运行此文件，则执行主任务函数
if (require.main === module) {
  executeTwitterScrapingTask();
}
