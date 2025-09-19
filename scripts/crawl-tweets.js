/**
 * X.com (Twitter) 推文爬取服务
 * @module TwitterCrawler
 * @requires puppeteer
 * @requires fs
 * @requires path
 */
require("dotenv").config();

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { storeTweetDataToSupabase } = require("../src/data/database");
const APPLICATION_CONFIG = require("../src/lib/config.js");
const { Logger } = require("../src/lib/utils");

const CONFIG = {
  CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
  COOKIES_FILE_PATH: "../cookies.json",
  DEFAULT_MAX_SCROLL_COUNT: 100,
  PAGE_LOAD_TIMEOUT: 60000,
  CONSECUTIVE_EMPTY_SCROLL_LIMIT: 5,
  SCROLL_HEIGHT: [300, 600],
  SCROLL_DELAY: [1500, 2500],
};

/**
 * 处理"显示更多"按钮的点击操作
 * @param {Object} page - Puppeteer页面对象
 * @returns {Promise<void>}
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
      Logger.info(`成功点击 ${clickResult} 个Show more按钮`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } catch (error) {
    Logger.warn(`处理Show more按钮时出错: ${error.message}`);
  }
}

/**
 * 浏览器连接重试配置
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  CONNECTION_TIMEOUT: 30000,
  PAGE_TIMEOUT: 60000
};

/**
 * 创建带重试机制的浏览器实例
 * @param {Object} launchOptions - 浏览器启动选项
 * @param {number} retryCount - 当前重试次数
 * @returns {Promise<Object>} 浏览器实例
 */
async function createBrowserWithRetry(launchOptions, retryCount = 0) {
  try {
    console.log(`[${new Date().toISOString()}] [BROWSER-CREATE] 正在创建浏览器实例...`);
    Logger.info(`尝试启动浏览器 (第${retryCount + 1}次)...`);
    
    // 添加启动前等待时间，特别是在重试时
    if (retryCount > 0) {
      const waitTime = RETRY_CONFIG.RETRY_DELAY * (retryCount + 1);
      Logger.info(`启动前等待 ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const browser = await puppeteer.launch(launchOptions);
    
    // 监听浏览器断开连接事件
    browser.on('disconnected', () => {
      Logger.warn('浏览器连接已断开');
    });
    
    // 添加连接稳定性检查
    try {
      const pages = await browser.pages();
      if (pages.length === 0) {
        await browser.newPage();
      }
      console.log(`[${new Date().toISOString()}] [BROWSER-SUCCESS] 浏览器实例创建成功`);
      Logger.info('浏览器启动成功，连接稳定');
      return browser;
    } catch (connectionError) {
      Logger.warn(`浏览器连接检查失败: ${connectionError.message}`);
      try {
        await browser.close();
      } catch (closeError) {
        Logger.warn(`关闭不稳定浏览器失败: ${closeError.message}`);
      }
      throw connectionError;
    }
    
  } catch (error) {
    const isProtocolError = error.message.includes('Protocol error') || 
                           error.message.includes('Target closed') ||
                           error.message.includes('Target.setAutoAttach') ||
                           error.message.includes('Target.setDiscoverTargets');
    
    if (isProtocolError) {
      Logger.warn(`检测到协议错误 (第${retryCount + 1}次): ${error.message}`);
    } else {
      Logger.error(`浏览器启动失败 (第${retryCount + 1}次): ${error.message}`);
    }
    
    if (retryCount < RETRY_CONFIG.MAX_RETRIES - 1) {
      const retryDelay = isProtocolError ? RETRY_CONFIG.RETRY_DELAY * 2 : RETRY_CONFIG.RETRY_DELAY;
      Logger.info(`等待 ${retryDelay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return createBrowserWithRetry(launchOptions, retryCount + 1);
    }
    
    throw new Error(`浏览器启动失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次: ${error.message}`);
  }
}

/**
 * 创建带错误处理的页面实例
 * @param {Object} browser - 浏览器实例
 * @returns {Promise<Object>} 页面实例
 */
async function createPageWithErrorHandling(browser) {
  const page = await browser.newPage();
  
  // 设置页面错误处理
  page.on('error', (error) => {
    Logger.error(`页面错误: ${error.message}`);
  });
  
  page.on('pageerror', (error) => {
    Logger.error(`页面JavaScript错误: ${error.message}`);
  });
  
  page.on('requestfailed', (request) => {
    Logger.warn(`请求失败: ${request.url()} - ${request.failure().errorText}`);
  });
  
  // 设置超时
  page.setDefaultTimeout(RETRY_CONFIG.PAGE_TIMEOUT);
  page.setDefaultNavigationTimeout(RETRY_CONFIG.PAGE_TIMEOUT);
  
  return page;
}

/**
 * 执行Twitter推文爬取任务
 * @param {string} targetUrl - 目标URL
 * @param {number} [maxTweets=50] - 最大推文数量
 * @returns {Promise<Array>} 推文数据数组
 * @throws {Error} 爬取错误时抛出
 */
async function scrapeTwitterListWithAuthentication(
  listId,
  maxScrollCount = CONFIG.DEFAULT_MAX_SCROLL_COUNT
) {
  if (!listId) {
    throw new Error("列表 ID 不能为空");
  }

  const targetUrl = `https://x.com/i/lists/${listId}`;
  Logger.info(`开始爬取推特列表: ${listId}`);

  const launchOptions = {
    headless: process.env.HEADLESS !== 'false',
    executablePath: CONFIG.CHROME_EXECUTABLE_PATH,
    defaultViewport: null,
    timeout: 0,
    args: [
      // Docker环境必需参数
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      
      // 基础稳定性参数
      "--no-first-run",
      "--disable-extensions",
      "--disable-notifications",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-blink-features=AutomationControlled",
      
      // 内存和性能优化
      "--single-process",
      "--max_old_space_size=4096",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      
      // 协议错误修复
      "--disable-ipc-flooding-protection",
      "--headless=new"
    ],
    ignoreDefaultArgs: ["--enable-automation"],
    protocolTimeout: 240000,
    waitForInitialPage: false,
  };

  if (process.env.PROXY_HOST) {
    const host = process.env.PROXY_HOST;
    const port = process.env.PROXY_PORT || "7890";
    
    const proxyServer = `http://${host}:${port}`;
    Logger.info(`使用代理: ${proxyServer}`);
    
    launchOptions.args.push(`--proxy-server=${proxyServer}`, "--ignore-certificate-errors");
  }

  Logger.info("启动浏览器...");
  
  // Docker环境启动前额外等待
  Logger.info('Docker环境启动前等待...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const browser = await createBrowserWithRetry(launchOptions);
  
  // 额外的连接稳定性检查
  Logger.info('执行连接稳定性检查...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 验证浏览器连接状态
  if (!browser.isConnected()) {
    throw new Error('浏览器连接不稳定');
  }
  
  console.log(`[${new Date().toISOString()}] [PAGE-CREATE] 正在创建页面实例...`);
  const page = await createPageWithErrorHandling(browser);
  console.log(`[${new Date().toISOString()}] [PAGE-SUCCESS] 页面实例创建成功`);
  
  // 页面创建后稳定性检查
  await new Promise(resolve => setTimeout(resolve, 500));
  
  if (page.isClosed()) {
    throw new Error('页面创建后立即关闭，连接不稳定');
  }

  try {

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

    console.log(`[${new Date().toISOString()}] [COOKIE-SET] 正在设置Cookie...`);
    await page.setCookie(...formattedCookies);
    console.log(`[${new Date().toISOString()}] [COOKIE-SUCCESS] Cookie设置完成`);
    Logger.info("Cookies设置成功");

    Logger.info(`访问页面: ${targetUrl}`);
    
    // 使用重试机制访问页面
    let navigationSuccess = false;
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        // 检查页面是否仍然连接
        if (page.isClosed()) {
          throw new Error('页面已关闭，无法导航');
        }
        
        await page.goto(targetUrl, {
          waitUntil: "networkidle2",
          timeout: RETRY_CONFIG.PAGE_TIMEOUT,
        });
        navigationSuccess = true;
        break;
      } catch (error) {
        const isProtocolError = error.message.includes('Protocol error') || 
                               error.message.includes('Target closed') ||
                               error.message.includes('Target.setAutoAttach') ||
                               error.message.includes('Target.setDiscoverTargets');
        
        if (isProtocolError) {
          Logger.warn(`页面导航协议错误 (第${attempt + 1}次): ${error.message}`);
        } else {
          Logger.warn(`页面导航失败 (第${attempt + 1}次): ${error.message}`);
        }
        
        if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
          const waitTime = isProtocolError ? RETRY_CONFIG.RETRY_DELAY * 2 : RETRY_CONFIG.RETRY_DELAY;
          Logger.info(`等待 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    if (!navigationSuccess) {
      throw new Error(`页面导航失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次`);
    }

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
      Logger.info("已处理cookie同意弹窗");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      Logger.info("未发现cookie弹窗或已处理");
    }

    // 使用重试机制等待推文元素加载
    let elementsLoaded = false;
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        await page.waitForSelector('article [data-testid="tweetText"]', {
          timeout: RETRY_CONFIG.PAGE_TIMEOUT,
        });
        elementsLoaded = true;
        break;
      } catch (error) {
        Logger.warn(`等待推文元素失败 (第${attempt + 1}次): ${error.message}`);
        if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
          Logger.info(`等待 ${RETRY_CONFIG.RETRY_DELAY}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY));
          // 尝试刷新页面
          try {
            await page.reload({ waitUntil: 'networkidle2', timeout: RETRY_CONFIG.PAGE_TIMEOUT });
          } catch (reloadError) {
            Logger.warn(`页面刷新失败: ${reloadError.message}`);
          }
        }
      }
    }
    
    if (!elementsLoaded) {
      throw new Error(`推文元素加载失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次`);
    }
    
    Logger.info("页面加载成功");

    // 滚动页面并收集推文数据
    let collectedTweets = [];
    let previousTweetCount = 0;
    let consecutiveEmptyScrolls = 0;
    let currentScrollCount = 0;

    Logger.info("开始收集推文数据...");

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
      Logger.info(`当前已收集 ${collectedTweets.length} 条推文`);

      // 检查是否有新推文
      if (collectedTweets.length === previousTweetCount) {
        consecutiveEmptyScrolls++;
        if (consecutiveEmptyScrolls >= CONFIG.CONSECUTIVE_EMPTY_SCROLL_LIMIT) {
          Logger.info(
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

    Logger.info(`爬取完成，共获取 ${collectedTweets.length} 条推文`);

    if (collectedTweets.length > 0) {
      const databaseReadyTweets = collectedTweets.map((tweet) => ({
        content: tweet.content,
        url: tweet.url,
        created_at: new Date().toISOString(),
        list_id: listId,
      }));

      await storeTweetDataToSupabase(databaseReadyTweets);
      Logger.info(`成功存储 ${collectedTweets.length} 条推文到数据库`);
    } else {
      Logger.warn("未获取到推文数据");
    }

    return collectedTweets;
  } catch (error) {
    Logger.error("爬取过程中发生错误:", { error: error.message });
    
    // 检查是否是Target closed错误
    if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
      Logger.warn('检测到浏览器连接错误，可能需要重启浏览器');
    }
    
    throw error;
  } finally {
    // 确保浏览器被正确关闭
    try {
      if (browser && browser.isConnected()) {
        // 关闭所有页面
        const pages = await browser.pages();
        await Promise.all(pages.map(page => {
          return page.close().catch(err => {
            Logger.warn(`关闭页面失败: ${err.message}`);
          });
        }));
        
        // 关闭浏览器
        await browser.close();
        Logger.info('浏览器已正确关闭');
      }
    } catch (closeError) {
      Logger.error(`关闭浏览器时出错: ${closeError.message}`);
    }
  }
}

async function executeTwitterScrapingTask() {
  const defaultListId = "1950374938378113192";
  const testScrollCount = 500;

  try {
    console.log(`[${new Date().toISOString()}] [CRAWL-START] 开始执行Twitter爬取任务...`);
    Logger.info("=== 推文爬取服务启动 ===");
    const scrapedTweets = await scrapeTwitterListWithAuthentication(defaultListId, testScrollCount);
    console.log(`[${new Date().toISOString()}] [CRAWL-COMPLETE] 推文爬取任务完成`);
    Logger.info("=== 爬取任务完成 ===");
    console.log(`[${new Date().toISOString()}] [CRAWL-SUCCESS] 成功爬取 ${scrapedTweets.length} 条推文`);
    Logger.info(`总计获取: ${scrapedTweets.length} 条推文`);
  } catch (error) {
    Logger.error("=== 爬取任务失败 ===");
    console.error(`[${new Date().toISOString()}] [CRAWL-ERROR] 推文爬取任务失败: ${error.message}`);
    Logger.error("错误:", { error: error.message });
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
