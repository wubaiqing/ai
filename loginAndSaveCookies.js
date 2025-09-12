/**
 * X.com 自动登录并保存 Cookies 脚本
 * 使用 Puppeteer 自动化登录 X.com 并保存登录状态的 cookies
 */

require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// 配置常量
const CONFIG = {
  CHROME_PATH: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  COOKIES_FILE: './cookies.json',
  LOGIN_URL: 'https://x.com/i/flow/login',
  TIMEOUT: 30000,
  WAIT_TIME: 2000
};

/**
 * 自动登录 X.com 并保存 cookies
 * @param {string} username - X.com 用户名或邮箱
 * @param {string} password - X.com 密码
 * @returns {Promise<boolean>} 登录是否成功
 */
async function loginAndSaveCookies(username, password) {
  let browser = null;
  let page = null;

  try {
    console.log('[登录] 开始启动浏览器...');
    
    // 启动浏览器
    browser = await puppeteer.launch({
      headless: false, // 设置为 false 以便调试
      executablePath: CONFIG.CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    
    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36');
    
    // 设置视口
    await page.setViewport({ width: 1280, height: 800 });

    console.log('[登录] 正在打开登录页面...');
    await page.goto(CONFIG.LOGIN_URL, { waitUntil: 'networkidle2' });

    // 等待用户名输入框出现
    console.log('[登录] 等待用户名输入框...');
    await page.waitForSelector('input[name="text"]', { timeout: CONFIG.TIMEOUT });
    
    // 输入用户名
    console.log('[登录] 输入用户名...');
    await page.type('input[name="text"]', username, { delay: 100 });
    
    // 点击下一步按钮
    await page.click('[role="button"]:has-text("下一步"), [role="button"]:has-text("Next")');
    await page.waitForTimeout(CONFIG.WAIT_TIME);

    // 等待密码输入框出现
    console.log('[登录] 等待密码输入框...');
    await page.waitForSelector('input[name="password"]', { timeout: CONFIG.TIMEOUT });
    
    // 输入密码
    console.log('[登录] 输入密码...');
    await page.type('input[name="password"]', password, { delay: 100 });
    
    // 点击登录按钮
    console.log('[登录] 点击登录按钮...');
    await page.click('[role="button"]:has-text("登录"), [role="button"]:has-text("Log in")');
    
    // 等待登录完成，检查是否跳转到主页
    console.log('[登录] 等待登录完成...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
    
    // 检查是否登录成功（通过URL判断）
    const currentUrl = page.url();
    if (currentUrl.includes('home') || currentUrl === 'https://x.com/') {
      console.log('[登录] 登录成功！');
      
      // 获取并保存 cookies
      console.log('[登录] 正在保存 cookies...');
      const cookies = await page.cookies();
      
      // 保存 cookies 到文件
      const cookiesPath = path.resolve(__dirname, CONFIG.COOKIES_FILE);
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      
      console.log(`[登录] Cookies 已保存到 ${cookiesPath}`);
      console.log(`[登录] 共保存了 ${cookies.length} 个 cookies`);
      
      return true;
    } else {
      console.error('[登录] 登录失败，当前页面:', currentUrl);
      return false;
    }
    
  } catch (error) {
    console.error('[登录] 登录过程中发生错误:', error.message);
    return false;
  } finally {
    if (browser) {
      console.log('[登录] 关闭浏览器...');
      await browser.close();
    }
  }
}

/**
 * 从环境变量获取登录凭据并执行登录
 * @returns {Promise<boolean>} 登录是否成功
 */
async function loginFromEnv() {
  const username = process.env.X_USERNAME;
  const password = process.env.X_PASSWORD;
  
  if (!username || !password) {
    console.error('[登录] 缺少登录凭据');
    console.error('[登录] 请在 .env 文件中设置 X_USERNAME 和 X_PASSWORD');
    return false;
  }
  
  console.log(`[登录] 使用用户名: ${username.substring(0, 3)}***`);
  return await loginAndSaveCookies(username, password);
}

/**
 * 检查 cookies 是否存在且有效
 * @returns {boolean} cookies 是否有效
 */
function checkCookiesExist() {
  const cookiesPath = path.resolve(__dirname, CONFIG.COOKIES_FILE);
  
  if (!fs.existsSync(cookiesPath)) {
    console.log('[检查] cookies.json 文件不存在');
    return false;
  }
  
  try {
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
    if (!Array.isArray(cookies) || cookies.length === 0) {
      console.log('[检查] cookies.json 文件为空或格式错误');
      return false;
    }
    
    console.log(`[检查] 找到 ${cookies.length} 个 cookies`);
    return true;
  } catch (error) {
    console.error('[检查] cookies.json 文件格式错误:', error.message);
    return false;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  (async () => {
    console.log('=== X.com 自动登录工具 ===');
    
    // 检查是否已有有效的 cookies
    if (checkCookiesExist()) {
      console.log('[提示] 已存在 cookies 文件，如需重新登录请删除 cookies.json 文件');
      process.exit(0);
    }
    
    // 执行登录
    const success = await loginFromEnv();
    
    if (success) {
      console.log('[完成] 登录成功，cookies 已保存');
      process.exit(0);
    } else {
      console.error('[失败] 登录失败');
      process.exit(1);
    }
  })();
}

// 导出函数供其他模块使用
module.exports = {
  loginAndSaveCookies,
  loginFromEnv,
  checkCookiesExist
};