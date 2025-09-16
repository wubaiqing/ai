/**
 * X.com 推文爬取服务 - 简化版
 * 使用 Puppeteer 爬取指定列表的推文数据并存储到 Supabase
 */

// 加载环境变量
require("dotenv").config();

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { storeTweetDataToSupabase } = require("../src/data/database");

// 应用配置
const CONFIG = {
  CHROME_EXECUTABLE_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  COOKIES_FILE_PATH: "../cookies.json",
  DEFAULT_MAX_SCROLL_COUNT: 100,
  PAGE_LOAD_TIMEOUT: 60000,
  CONSECUTIVE_EMPTY_SCROLL_LIMIT: 5,
  SCROLL_HEIGHT_MIN: 300,
  SCROLL_HEIGHT_MAX: 600,
  SCROLL_DELAY_MIN: 1500,
  SCROLL_DELAY_MAX: 2500,
};

/**
 * 处理页面中的'Show more'按钮，点击展开完整推文内容
 * @param {Object} page - Puppeteer页面对象
 */
async function handleShowMoreButtons(page) {
  try {
    const clickResult = await page.evaluate(async () => {
      let buttonsClicked = 0;
      const articles = document.querySelectorAll('article');
      
      for (const article of articles) {
        // 跳过引用推文
        const isQuotedTweet = article.querySelector('[data-testid="quoteTweet"]') || 
                             article.closest('[data-testid="quoteTweet"]');
        if (isQuotedTweet) continue;
        
        // 查找Show more按钮
        const showMoreElement = article.querySelector('[data-testid="tweet-text-show-more-link"]');
        if (showMoreElement) {
          const text = showMoreElement.textContent?.trim();
          if (text && (text === 'Show more' || text === '显示更多')) {
            const rect = showMoreElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              try {
                showMoreElement.click();
                buttonsClicked++;
                await new Promise(resolve => setTimeout(resolve, 500));
              } catch (e) {
                console.log(`点击Show more按钮失败: ${e.message}`);
              }
            }
          }
        }
      }
      
      return { buttonsClicked };
    });
    
    if (clickResult.buttonsClicked > 0) {
      console.log(`成功点击 ${clickResult.buttonsClicked} 个Show more按钮`);
      await new Promise(resolve => setTimeout(resolve, 1000));
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
async function scrapeTwitterListWithAuthentication(listId, maxScrollCount = CONFIG.DEFAULT_MAX_SCROLL_COUNT) {
  if (!listId) {
    throw new Error("列表 ID 不能为空");
  }

  const targetUrl = `https://x.com/i/lists/${listId}`;
  console.log(`开始爬取推特列表: ${listId}`);

  // 浏览器启动配置
  const launchOptions = {
    headless: false,
    executablePath: CONFIG.CHROME_EXECUTABLE_PATH,
    defaultViewport: null,
    timeout: CONFIG.PAGE_LOAD_TIMEOUT,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--window-size=1920,1080",
      "--start-maximized",
      "--disable-notifications",
      "--disable-extensions",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--disable-default-apps",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  };

  // Clash代理配置
  if (process.env.PROXY_HOST) {
    const proxyServer = `${process.env.PROXY_HOST}:${process.env.PROXY_PORT || '7890'}`;
    console.log(`使用Clash代理服务器: ${proxyServer}`);
    launchOptions.args.push(`--proxy-server=${proxyServer}`);
    
    // 添加代理相关参数
    launchOptions.args.push('--ignore-certificate-errors');
    launchOptions.args.push('--ignore-ssl-errors');
    launchOptions.args.push('--allow-running-insecure-content');
    launchOptions.args.push('--disable-web-security');
  }

  // 启动浏览器
  console.log('启动浏览器...');
  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();

  try {
    // 设置页面超时
    page.setDefaultTimeout(CONFIG.PAGE_LOAD_TIMEOUT);
    page.setDefaultNavigationTimeout(CONFIG.PAGE_LOAD_TIMEOUT);

    // Clash代理不需要用户名密码认证

    // 设置用户代理
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // 禁用图片加载以提高性能
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
        request.abort();
      } else {
        request.continue();
      }
    });

    // 加载认证cookies
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
    console.log("认证Cookies设置成功");

    // 导航到目标页面
    console.log(`正在访问页面: ${targetUrl}`);
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: CONFIG.PAGE_LOAD_TIMEOUT
    });

    // 等待推文内容加载
    console.log('等待推文内容加载...');
    await page.waitForSelector('article [data-testid="tweetText"]', {
      timeout: CONFIG.PAGE_LOAD_TIMEOUT,
    });
    console.log("推文列表加载成功");

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
          const tweetTextElement = articleElement.querySelector('[data-testid="tweetText"]');
          const tweetLinkElement = articleElement.querySelector('a[href*="/status/"]');
          
          const content = tweetTextElement ? tweetTextElement.innerText.trim() : "";
          const url = tweetLinkElement ? tweetLinkElement.href : "";
          
          return { content, url };
        })
      );

      // 过滤有效推文并去重
      const validNewTweets = currentPageTweets.filter(tweet => 
        tweet.url && tweet.url.trim() !== '' && 
        tweet.content && tweet.content.trim() !== ''
      );

      // 基于URL去重合并
      const allTweets = [...collectedTweets, ...validNewTweets];
      const uniqueTweetMap = new Map();
      
      allTweets.forEach(tweet => {
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
          console.log(`连续${CONFIG.CONSECUTIVE_EMPTY_SCROLL_LIMIT}次滚动没有发现新推文，可能已到达列表底部`);
          break;
        }
      } else {
        consecutiveEmptyScrolls = 0;
        previousTweetCount = collectedTweets.length;
      }

      // 模拟真实用户滚动
      await page.evaluate((minHeight, maxHeight) => {
        const randomScrollHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
        window.scrollBy(0, randomScrollHeight);
      }, CONFIG.SCROLL_HEIGHT_MIN, CONFIG.SCROLL_HEIGHT_MAX);

      // 随机延迟
      const randomDelayTime = Math.floor(
        Math.random() * (CONFIG.SCROLL_DELAY_MAX - CONFIG.SCROLL_DELAY_MIN)
      ) + CONFIG.SCROLL_DELAY_MIN;
      await page.evaluate((delayTime) => {
        return new Promise((resolve) => setTimeout(resolve, delayTime));
      }, randomDelayTime);

      currentScrollCount++;
    }

    console.log(`数据爬取完成，共获取 ${collectedTweets.length} 条推文`);

    // 存储到数据库
    if (collectedTweets.length > 0) {
      console.log("开始将推文数据存储到数据库...");
      const databaseReadyTweets = collectedTweets.map((tweetData) => ({
        content: tweetData.content,
        url: tweetData.url,
        created_at: new Date().toISOString(),
        list_id: listId,
      }));

      await storeTweetDataToSupabase(databaseReadyTweets);
      console.log(`成功将 ${collectedTweets.length} 条推文存储到数据库`);
    } else {
      console.log("未获取到任何推文数据");
    }

    return collectedTweets;

  } catch (error) {
    console.error('爬取过程中发生错误:', error.message);
    throw error;
  } finally {
    // 确保浏览器被关闭
    await browser.close();
  }
}

/**
 * 主执行函数
 */
async function executeTwitterScrapingTask() {
  const defaultListId = "1950374938378113192";
  const testScrollCount = 10;

  try {
    console.log("=== Twitter推文爬取服务启动 ===");
    const scrapedTweets = await scrapeTwitterListWithAuthentication(defaultListId, testScrollCount);
    console.log("=== 数据爬取任务完成 ===");
    console.log(`总计获取推文数据: ${scrapedTweets.length} 条`);
  } catch (error) {
    console.error("=== 数据爬取任务失败 ===");
    console.error("错误详情:", error.message);
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
