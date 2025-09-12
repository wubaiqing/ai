/**
 * X.com 自动登录并保存 Cookies 脚本
 * 使用 Puppeteer 自动化登录 X.com 并保存登录状态的 cookies
 */

require('dotenv').config();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const config = require("./lib/config");

// 应用程序配置常量
const APPLICATION_CONFIG = {
  CHROME_EXECUTABLE_PATH: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  COOKIES_FILE_PATH: "cookies.json",
  LOGIN_OPERATION_TIMEOUT: 30000,
  PAGE_NAVIGATION_TIMEOUT: 10000,
  BROWSER_VIEWPORT: { width: 1280, height: 720 },
  BROWSER_USER_AGENT:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

/**
 * 自动登录 Twitter/X.com 并保存认证cookies
 * @param {string} userAccountName - 用户账户名
 * @param {string} userPassword - 用户密码
 * @param {string} userEmail - 用户邮箱（可选，用于二次验证）
 */
async function authenticateAndSaveCookies(userAccountName, userPassword, userEmail = null) {
  let browserInstance = null;
  let webPage = null;

  try {
    console.log('正在启动浏览器实例...');
    
    // 启动浏览器
    browserInstance = await puppeteer.launch({
      headless: false, // 设置为 false 以便调试观察
      executablePath: APPLICATION_CONFIG.CHROME_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    webPage = await browserInstance.newPage();
    await webPage.setViewport(APPLICATION_CONFIG.BROWSER_VIEWPORT);
    await webPage.setUserAgent(APPLICATION_CONFIG.BROWSER_USER_AGENT);

    console.log("正在导航到 Twitter/X.com 登录页面...");
    await webPage.goto("https://x.com/i/flow/login", {
      waitUntil: "networkidle2",
      timeout: APPLICATION_CONFIG.PAGE_NAVIGATION_TIMEOUT,
    });

    // 等待用户名输入框加载完成
    console.log("等待用户名输入框加载...");
    await webPage.waitForSelector('input[name="text"]', {
      timeout: APPLICATION_CONFIG.LOGIN_OPERATION_TIMEOUT,
    });

    // 填入用户账户名
    console.log("正在输入用户账户名...");
    await webPage.type('input[name="text"]', userAccountName, { delay: 100 });

    // 点击进入下一步按钮
    console.log("点击进入下一步...");
    await webPage.click('[role="button"]:has-text("下一步")');

    // 等待密码输入框或邮箱验证界面加载
    console.log("等待密码输入或验证步骤加载...");
    await webPage.waitForTimeout(2000);

    // 检查是否需要进行邮箱验证
    const emailVerificationInput = await webPage.$('input[name="text"]');
    if (emailVerificationInput && userEmail) {
      console.log("检测到邮箱验证步骤，正在输入验证邮箱...");
      await webPage.type('input[name="text"]', userEmail, { delay: 100 });
      await webPage.click('[role="button"]:has-text("下一步")');
      await webPage.waitForTimeout(2000);
    }

    // 等待密码输入框加载
    console.log("等待密码输入框加载...");
    await webPage.waitForSelector('input[name="password"]', {
      timeout: APPLICATION_CONFIG.LOGIN_OPERATION_TIMEOUT,
    });

    // 填入用户密码
    console.log("正在输入用户密码...");
    await webPage.type('input[name="password"]', userPassword, { delay: 100 });

    // 点击登录确认按钮
    console.log("点击登录确认按钮...");
    await webPage.click('[role="button"]:has-text("登录")');

    // 等待登录操作完成
    console.log("等待登录操作完成...");
    await webPage.waitForNavigation({ waitUntil: "networkidle2", timeout: APPLICATION_CONFIG.LOGIN_OPERATION_TIMEOUT });
    
    // 检查是否登录成功（通过URL判断）
    const currentUrl = webPage.url();
    if (currentUrl.includes('home') || currentUrl === 'https://x.com/') {
      console.log('用户登录认证成功！');
      
      // 获取认证cookies数据
      console.log("正在获取认证cookies数据...");
      const authenticationCookies = await webPage.cookies();
      
      // 将cookies数据保存到本地文件
      console.log("正在保存cookies数据到本地文件...");
      const cookiesStoragePath = path.resolve(__dirname, APPLICATION_CONFIG.COOKIES_FILE_PATH);
      fs.writeFileSync(cookiesStoragePath, JSON.stringify(authenticationCookies, null, 2));
      
      console.log(`认证Cookies已成功保存到: ${cookiesStoragePath}`);
      console.log(`共保存了 ${authenticationCookies.length} 个 cookies`);
      
      return true;
    } else {
      console.error('用户登录认证失败，当前页面:', currentUrl);
      return false;
    }
    
  } catch (error) {
    console.error('用户登录认证失败:', error.message);
    return false;
  } finally {
    if (browserInstance) {
      console.log('浏览器实例已关闭');
      await browserInstance.close();
    }
  }
}

/**
 * 从环境变量读取用户凭据并执行登录认证
 * @returns {Promise<boolean>} 登录是否成功
 */
async function authenticateFromEnvironmentVariables() {
  const environmentUsername = process.env.X_USERNAME;
  const environmentPassword = process.env.X_PASSWORD;
  const environmentEmail = process.env.X_EMAIL;
  
  if (!environmentUsername || !environmentPassword) {
    console.error('[登录] 缺少登录凭据');
    console.error('请在 .env 文件中设置 X_USERNAME 和 X_PASSWORD 环境变量');
    return false;
  }
  
  console.log(`使用环境变量进行用户认证: ${environmentUsername}`);
  return await authenticateAndSaveCookies(environmentUsername, environmentPassword, environmentEmail);
}

/**
 * 检查认证cookies文件是否存在且有效
 * @returns {boolean} cookies 是否有效
 */
function checkAuthenticationCookiesExist() {
  const cookiesStoragePath = path.resolve(__dirname, APPLICATION_CONFIG.COOKIES_FILE_PATH);
  
  if (!fs.existsSync(cookiesStoragePath)) {
    console.log('[检查] cookies.json 文件不存在');
    return false;
  }
  
  try {
      const storedCookies = JSON.parse(fs.readFileSync(cookiesStoragePath, 'utf-8'));
      if (!Array.isArray(storedCookies) || storedCookies.length === 0) {
        console.log('[检查] 认证cookies文件为空或格式错误');
        return false;
      }
      
      console.log(`[检查] 找到 ${storedCookies.length} 个有效cookies`);
      return true;
    } catch (error) {
      console.log('[检查] 认证cookies文件格式错误:', error.message);
      return false;
    }
}

/**
 * 主执行函数 - 启动Twitter/X.com自动登录认证流程
 */
async function executeAuthenticationProcess() {
  console.log('[启动] Twitter/X.com 自动登录认证脚本');
  
  // 检查是否已存在有效的认证cookies
  if (checkAuthenticationCookiesExist()) {
    console.log('[提示] 已存在有效cookies文件，如需重新登录请删除 cookies.json 文件');
    process.exit(0);
  }
  
  // 执行用户登录认证流程
  const authenticationSuccess = await authenticateFromEnvironmentVariables();
  
  if (authenticationSuccess) {
    console.log('[完成] 用户登录认证成功，cookies数据已保存');
    process.exit(0);
  } else {
    console.log('[失败] 用户登录认证失败');
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主认证流程
if (require.main === module) {
  executeAuthenticationProcess();
}

// 导出函数供其他模块使用
module.exports = {
  authenticateAndSaveCookies,
  authenticateFromEnvironmentVariables,
  checkAuthenticationCookiesExist
};