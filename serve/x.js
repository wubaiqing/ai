/**
 * X.com 推文爬取服务
 * 使用 Puppeteer 爬取指定列表的推文数据并存储到 Supabase
 */

// 加载环境变量
require("dotenv").config();

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const applicationConfig = require("../lib/config");
const { storeTweetDataToSupabase } = require("../lib/database");

/**
 * 处理页面中的'Show more'按钮，点击展开完整推文内容
 * 只点击主推文中的蓝色'Show more'按钮，不点击引用推文中的按钮
 * @param {Object} page - Puppeteer页面对象
 */
async function handleShowMoreButtons(page) {
  try {
    let buttonsClicked = 0;
    
    // 使用页面评估来查找和点击主推文中的'Show more'按钮
    const clickedCount = await page.evaluate(() => {
      let clicked = 0;
      
      // 查找所有文章元素（每个推文都在article标签内）
      const articles = document.querySelectorAll('article');
      
      articles.forEach(article => {
        // 检查是否为引用推文（quoted tweet）
        // 引用推文通常在特定的容器内，具有特定的data-testid或类名
        const isQuotedTweet = article.querySelector('[data-testid="quoteTweet"]') || 
                             article.closest('[data-testid="quoteTweet"]') ||
                             article.querySelector('.css-175oi2r[role="blockquote"]') ||
                             article.closest('.css-175oi2r[role="blockquote"]');
        
        // 如果是引用推文，跳过处理
        if (isQuotedTweet) {
          return;
        }
        
        // 在主推文中查找'Show more'按钮
        const showMoreSelectors = [
          '[data-testid="tweet-text-show-more-link"]',
          'span[style*="color: rgb(29, 155, 240)"]', // 蓝色文本
          'span[style*="color: rgb(29,155,240)"]',   // 蓝色文本（无空格）
          'a[role="link"] span',
          '[role="button"] span'
        ];
        
        const showMoreTexts = ['Show more', '显示更多'];
        const showMoreRepliesTexts = ['Show more replies', '显示更多回复'];
        
        showMoreSelectors.forEach(selector => {
          const elements = article.querySelectorAll(selector);
          elements.forEach(element => {
            const text = element.textContent?.trim();
            // 只点击'Show more'按钮，排除'Show more replies'按钮
            if (text && showMoreTexts.some(showText => text === showText) && 
                !showMoreRepliesTexts.some(replyText => text === replyText)) {
              // 检查元素是否可见且为蓝色
              const rect = element.getBoundingClientRect();
              const computedStyle = window.getComputedStyle(element);
              const color = computedStyle.color;
              
              // 检查是否为蓝色（Twitter的蓝色通常是rgb(29, 155, 240)）
              const isBlueColor = color.includes('29, 155, 240') || 
                                color.includes('rgb(29,155,240)') ||
                                color.includes('#1d9bf0');
              
              if (rect.width > 0 && rect.height > 0 && isBlueColor) {
                try {
                  // 尝试点击元素或其父级可点击元素
                  let clickTarget = element;
                  while (clickTarget && clickTarget !== document.body) {
                    if (clickTarget.tagName === 'A' || 
                        clickTarget.getAttribute('role') === 'button' || 
                        clickTarget.getAttribute('role') === 'link' ||
                        clickTarget.onclick) {
                      clickTarget.click();
                      clicked++;
                      console.log(`点击了主推文中的'Show more'按钮: ${text}`);
                      return; // 找到并点击后退出
                    }
                    clickTarget = clickTarget.parentElement;
                  }
                } catch (e) {
                  console.log(`点击'Show more'按钮失败: ${e.message}`);
                }
              }
            }
          });
        });
      });
      
      return clicked;
    });
    
    buttonsClicked = clickedCount;
    
    if (buttonsClicked > 0) {
      console.log(`成功点击 ${buttonsClicked} 个主推文中的'Show more'按钮`);
      // 等待页面内容完全展开
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.log(`处理'Show more'按钮时出错: ${error.message}`);
    // 错误不影响主流程，继续执行
  }
}
const APPLICATION_CONFIG = {
  CHROME_EXECUTABLE_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  COOKIES_FILE_PATH: "../cookies.json",
  DEFAULT_MAX_SCROLL_COUNT: 100,
  PAGE_LOAD_TIMEOUT: 20000,
  CONSECUTIVE_EMPTY_SCROLL_LIMIT: 5,
  SCROLL_HEIGHT_MIN: 300,
  SCROLL_HEIGHT_MAX: 600,
  SCROLL_DELAY_MIN: 1500,
  SCROLL_DELAY_MAX: 2500,
};

/**
 * 爬取 X.com 列表推文数据
 * @param {string} listId - X.com 列表 ID
 * @param {number} maxScrolls - 最大滚动次数，默认 100
 * @returns {Promise<Array>} 推文数据数组
 */
async function scrapeTwitterListWithAuthentication(
  listId,
  maxScrollCount = APPLICATION_CONFIG.DEFAULT_MAX_SCROLL_COUNT
) {
  if (!listId) {
    throw new Error("列表 ID 不能为空");
  }

  const targetUrl = `https://x.com/i/lists/${listId}`;
  console.log(`开始爬取推特列表: ${listId}`);

  // 启动浏览器实例
  const browserInstance = await puppeteer.launch({
    headless: false,
    executablePath: APPLICATION_CONFIG.CHROME_EXECUTABLE_PATH,
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

  const webPage = await browserInstance.newPage();

  // 设置真实的用户代理字符串
  await webPage.setUserAgent(
    "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
  );

  // 配置HTTP请求头以模拟真实用户
  await webPage.setExtraHTTPHeaders({
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "sec-ch-ua":
      '"Google Chrome";v="135", "Chromium";v="135", "Not-A.Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
  });

  // 加载并配置认证cookies
  try {
    const cookiesFilePath = path.resolve(__dirname, APPLICATION_CONFIG.COOKIES_FILE_PATH);
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

    await webPage.setCookie(...formattedCookies);
    console.log("认证Cookies设置成功");
  } catch (error) {
    await browserInstance.close();
    throw new Error(`Cookies设置失败: ${error.message}`);
  }

  console.log(`正在打开目标页面 ${targetUrl} ...`);
  await webPage.goto(targetUrl, { waitUntil: "networkidle2" });

  // 等待推文内容加载完成
  try {
    await webPage.waitForSelector('article [data-testid="tweetText"]', {
      timeout: APPLICATION_CONFIG.PAGE_LOAD_TIMEOUT,
    });
    console.log("推文列表加载成功");
  } catch (error) {
    await browserInstance.close();
    throw new Error("推文列表加载超时，请检查列表ID或网络连接");
  }

  // 滚动页面并收集推文数据
  let collectedTweets = [];
  let previousTweetCount = 0;
  let consecutiveEmptyScrolls = 0;
  let currentScrollCount = 0;

  console.log("开始收集推文数据...");

  while (currentScrollCount < maxScrollCount) {
    // 获取当前页面上的所有推文
    // 首先处理所有可能的'Show more'按钮
    await handleShowMoreButtons(webPage);

    // 添加调试信息，检查页面上的推文元素
    const articleCount = await webPage.$$eval("article", articles => articles.length);
    console.log(`页面上找到 ${articleCount} 个article元素`);
    
    if (articleCount === 0) {
      // 如果没有找到article元素，尝试其他可能的选择器
      const alternativeSelectors = [
        '[data-testid="tweet"]',
        '[data-testid="cellInnerDiv"]',
        '[role="article"]'
      ];
      
      for (const selector of alternativeSelectors) {
        const count = await webPage.$$eval(selector, elements => elements.length);
        console.log(`选择器 ${selector} 找到 ${count} 个元素`);
      }
    }

    const currentPageTweets = await webPage.$$eval("article", (articleNodes) =>
      articleNodes.map((articleElement) => {
        const tweetTextElement = articleElement.querySelector('[data-testid="tweetText"]');
        const tweetLinkElement = articleElement.querySelector('a[href*="/status/"]');
        
        // 添加调试信息
        const hasText = !!tweetTextElement;
        const hasLink = !!tweetLinkElement;
        const content = tweetTextElement ? tweetTextElement.innerText.trim() : "";
        const url = tweetLinkElement ? tweetLinkElement.href : "";
        
        // 在浏览器控制台输出调试信息
        console.log(`推文调试: hasText=${hasText}, hasLink=${hasLink}, content长度=${content.length}, url=${url}`);
        
        return {
           content: content,
           url: url,
         };
       })
     );
    // 合并新推文并去重（基于URL字段进行正确的去重）
    const beforeMergeCount = collectedTweets.length;
    const newTweetsCount = currentPageTweets.length;
    
    // 过滤掉空URL或空内容的推文
    const validNewTweets = currentPageTweets.filter(tweet => 
      tweet.url && tweet.url.trim() !== '' && 
      tweet.content && tweet.content.trim() !== ''
    );
    
    // 基于URL进行去重合并
    const allTweets = [...collectedTweets, ...validNewTweets];
    const uniqueTweetMap = new Map();
    
    allTweets.forEach(tweet => {
      if (!uniqueTweetMap.has(tweet.url)) {
        uniqueTweetMap.set(tweet.url, tweet);
      }
    });
    
    collectedTweets = Array.from(uniqueTweetMap.values());
    
    const afterMergeCount = collectedTweets.length;
    const duplicatesFiltered = (beforeMergeCount + validNewTweets.length) - afterMergeCount;
    
    console.log(`页面推文: ${newTweetsCount} 条, 有效: ${validNewTweets.length} 条, 去重: ${duplicatesFiltered} 条`);

    console.log(`当前已收集 ${collectedTweets.length} 条推文`);

    // 检查是否有新推文被添加
    if (collectedTweets.length === previousTweetCount) {
      consecutiveEmptyScrolls++;

      // 如果连续多次滚动都没有新推文，可能已经到底部了
      if (consecutiveEmptyScrolls >= APPLICATION_CONFIG.CONSECUTIVE_EMPTY_SCROLL_LIMIT) {
        console.log(
          `连续${APPLICATION_CONFIG.CONSECUTIVE_EMPTY_SCROLL_LIMIT}次滚动没有发现新推文，可能已到达列表底部`
        );
        break;
      }
    } else {
      // 重置空滚动计数器
      consecutiveEmptyScrolls = 0;
      previousTweetCount = collectedTweets.length;
    }

    // 模拟真实用户的滚动行为
    await webPage.evaluate(
      (minHeight, maxHeight) => {
        const randomScrollHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
        window.scrollBy(0, randomScrollHeight);
      },
      APPLICATION_CONFIG.SCROLL_HEIGHT_MIN,
      APPLICATION_CONFIG.SCROLL_HEIGHT_MAX
    );

    // 随机延迟等待，模拟人类浏览行为
    const randomDelayTime =
      Math.floor(
        Math.random() * (APPLICATION_CONFIG.SCROLL_DELAY_MAX - APPLICATION_CONFIG.SCROLL_DELAY_MIN)
      ) + APPLICATION_CONFIG.SCROLL_DELAY_MIN;
    await webPage.evaluate((delayTime) => {
      return new Promise((resolve) => setTimeout(resolve, delayTime));
    }, randomDelayTime);

    currentScrollCount++;
  }

  // 关闭浏览器实例
  await browserInstance.close();
  console.log(`数据爬取完成，共获取 ${collectedTweets.length} 条推文`);

  // 将推文数据存储到数据库
  if (collectedTweets.length > 0) {
    try {
      console.log("开始将推文数据存储到数据库...");

      const databaseReadyTweets = collectedTweets.map((tweetData) => ({
        content: tweetData.content,
        url: tweetData.url,
        created_at: new Date().toISOString(),
        list_id: listId,
      }));

      await storeTweetDataToSupabase(databaseReadyTweets);
      console.log(`成功将 ${collectedTweets.length} 条推文存储到数据库`);
    } catch (error) {
      console.error("推文数据入库失败:", error.message);
      throw error;
    }
  } else {
    console.log("未获取到任何推文数据");
  }

  return collectedTweets;
}

/**
 * 主执行函数 - 启动推文数据爬取任务
 */
async function executeTwitterScrapingTask() {
  const defaultListId = "1950374938378113192"; // 默认推特列表ID
  const testScrollCount = 100; // 测试环境使用较小的滚动次数

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

// 导出核心函数供其他模块使用
module.exports = {
  scrapeTwitterListWithAuthentication,
};

// 如果直接运行此文件，则执行主任务函数
if (require.main === module) {
  executeTwitterScrapingTask();
}
