const puppeteer = require('puppeteer');
const fs = require('fs');

async function loginAndSaveCookies(username, password) {
  const browser = await puppeteer.launch({
    headless: false, // 打开浏览器方便观察
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });

  // 输入用户名/邮箱
  await page.waitForSelector('input[name="text"]');
  await page.type('input[name="text"]', username, { delay: 100 });
  await page.keyboard.press('Enter');

  // 等待跳转到输入密码
  await page.waitForSelector('input[name="password"]', { timeout: 10000 });
  await page.type('input[name="password"]', password, { delay: 100 });
  await page.keyboard.press('Enter');

  // 等待登录完成（跳转到首页）
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // 保存 cookie
  const cookies = await page.cookies();
  fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
  console.log('✅ 登录成功，已保存 cookies.json');

  await browser.close();
}

// 示例调用（建议用环境变量存储账号密码）
loginAndSaveCookies(process.env.X_USERNAME, process.env.X_PASSWORD);
