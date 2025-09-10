const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeXListWithLogin(listId, tweetCount = 10) {
  const url = `https://x.com/i/lists/${listId}`;

  const browser = await puppeteer.launch({
    headless: true, // 改成 false 可以观察浏览器过程
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // 设置 User-Agent
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/135.0.0.0 Safari/537.36'
  );

  // 读取 cookies.json 并设置
  const cookiesPath = path.resolve(__dirname, 'cookies.json');
  if (!fs.existsSync(cookiesPath)) {
    throw new Error('未找到 cookies.json，请先导出 X 登录 cookie');
  }

  const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
  await page.context().addCookies(cookies);

  console.log(`正在打开 ${url} ...`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // 等待推文加载
  await page.waitForSelector('article [data-testid="tweetText"]', {
    timeout: 20000,
  });

  // 滚动并收集推文
  let collected = [];
  while (collected.length < tweetCount) {
    const tweets = await page.$$eval(
      'article [data-testid="tweetText"]',
      nodes => nodes.map(n => n.innerText.trim())
    );

    collected = [...new Set([...collected, ...tweets])];

    if (collected.length >= tweetCount) break;

    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(2000);
  }

  await browser.close();
  return collected.slice(0, tweetCount);
}

// 示例调用
scrapeXListWithLogin('1234567890123456789', 5)
  .then(tweets => {
    console.log('获取到的推文：');
    console.log(tweets);
  })
  .catch(err => {
    console.error('爬取失败:', err);
  });
