const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeXListWithLogin(listId, maxScrolls = 100) {
  const url = `https://x.com/i/lists/${listId}`;

  // 使用已安装的 Chrome 浏览器
  const browser = await puppeteer.launch({
    headless: true, // 显示浏览器界面
    executablePath:
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS 上 Chrome 的路径
    userDataDir: '~/Library/Application Support/Google/Chrome/Default', // 使用默认的用户数据目录
    defaultViewport: null, // 使用默认视口大小
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080', // 设置窗口大小
      '--start-maximized', // 最大化窗口
      '--disable-notifications', // 禁用通知
      '--disable-extensions', // 禁用扩展
    ],
    ignoreDefaultArgs: ['--enable-automation'], // 隐藏自动化控制标志
  });

  const page = await browser.newPage();

  // 设置更真实的 User-Agent
  await page.setUserAgent(
    'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36'
  );

  // 模拟真实用户行为
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'sec-ch-ua':
      '"Google Chrome";v="135", "Chromium";v="135", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"macOS"',
  });

  // 读取 cookies.json 并设置
  const cookiesPath = path.resolve(__dirname, 'cookies.json');
  if (!fs.existsSync(cookiesPath)) {
    throw new Error('未找到 cookies.json，请先导出 X 登录 cookie');
  }

  const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));

  // 为每个 cookie 添加必要属性
  const cookiesWithDomain = cookies.map(cookie => ({
    ...cookie,
    domain: '.x.com',
    path: '/',
    secure: true,
    sameSite: 'None',
  }));

  await page.setCookie(...cookiesWithDomain);

  console.log(`正在打开 ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 等待推文加载
  await page.waitForSelector('article [data-testid="tweetText"]', {
    timeout: 20000,
  });

  // 滚动并收集所有推文
  let collected = [];
  let previousLength = 0;
  let noNewTweetsCount = 0;
  let scrollCount = 0;

  console.log('开始收集推文...');

  while (scrollCount < maxScrolls) {
    // 获取当前页面上的所有推文

    const tweets = await page.$$eval('article', nodes =>
      nodes.map(article => {
        const textNode = article.querySelector('[data-testid="tweetText"]');
        const linkNode = article.querySelector('a[href*="/status/"]');
        return {
          content: textNode ? textNode.innerText.trim() : '',
          url: linkNode ? linkNode.href : '',
        };
      })
    );
    // 合并并去重
    collected = [...new Set([...collected, ...tweets])];

    console.log(`当前已收集 ${collected.length} 条推文`);

    // 检查是否有新推文被添加
    if (collected.length === previousLength) {
      noNewTweetsCount++;

      // 如果连续5次滚动都没有新推文，可能已经到底部了
      if (noNewTweetsCount >= 5) {
        console.log('连续5次滚动没有发现新推文，可能已到达列表底部');
        break;
      }
    } else {
      // 重置计数器
      noNewTweetsCount = 0;
      previousLength = collected.length;
    }

    // 模拟真实的滚动行为
    await page.evaluate(() => {
      const scrollHeight = Math.floor(Math.random() * 300) + 300; // 随机滚动距离
      window.scrollBy(0, scrollHeight);
    });

    // 使用 setTimeout 替代 waitForTimeout
    const randomWait = Math.floor(Math.random() * 1000) + 1500;
    await page.evaluate(wait => {
      return new Promise(resolve => setTimeout(resolve, wait));
    }, randomWait);

    scrollCount++;
  }

  // 不关闭浏览器，让用户可以继续操作
  // await browser.close();
  console.log(
    `爬取完成，共获取 ${collected.length} 条推文，浏览器保持打开状态，您可以继续操作`
  );

  return collected;
}

// 示例调用
scrapeXListWithLogin('1950374938378113192', 5)
  .then(tweets => {
    console.log('获取到的推文：');
    console.log(tweets);
  })
  .catch(err => {
    console.error('爬取失败:', err);
  });
