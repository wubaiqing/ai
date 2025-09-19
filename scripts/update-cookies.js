/**
 * X.com 自动登录和Cookie保存脚本
 * @module TwitterAuthentication
 * @requires dotenv
 * @requires puppeteer
 * @requires fs
 * @requires path
 */

require('dotenv').config();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const APPLICATION_CONFIG = require("../src/lib/config");
const { Logger } = require('../src/lib/utils');

// 应用程序配置常量
const LOCAL_CONFIG = {
  CHROME_EXECUTABLE_PATH: process.env.CHROME_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
  COOKIES_FILE_PATH: '../cookies.json',
  LOGIN_OPERATION_TIMEOUT: 30000,
  PAGE_NAVIGATION_TIMEOUT: 10000,
  BROWSER_VIEWPORT: { width: 1280, height: 720 }
};

/**
 * 执行X.com自动登录并保存认证Cookie
 * @param {string} userAccountName - 用户名或邮箱
 * @param {string} userPassword - 密码
 * @param {string} userEmail - 邮箱地址
 * @returns {Promise<boolean>} 登录是否成功
 * @throws {Error} 登录错误时抛出
 */
async function authenticateAndSaveCookies(userAccountName, userPassword, userEmail = null) {
  let browserInstance = null;
  let webPage = null;

  try {
    Logger.info('正在启动浏览器实例...');
    
    // 启动浏览器
    browserInstance = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      executablePath: LOCAL_CONFIG.CHROME_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-notifications",
        "--disable-extensions",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-ipc-flooding-protection",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-default-browser-check",
        "--no-pings",
        "--password-store=basic",
        "--use-mock-keychain",
        "--disable-component-extensions-with-background-pages",
        "--disable-field-trial-config",
        "--disable-hang-monitor",
        "--disable-prompt-on-repost",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-domain-reliability",
        "--single-process",
        "--headless=new",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });

    webPage = await browserInstance.newPage();
    await webPage.setViewport(LOCAL_CONFIG.BROWSER_VIEWPORT);
    await webPage.setUserAgent(APPLICATION_CONFIG.getUserAgent());

    Logger.info("正在导航到 Twitter/X.com 登录页面...");
    await webPage.goto("https://x.com/i/flow/login", {
      waitUntil: "networkidle2",
      timeout: LOCAL_CONFIG.PAGE_NAVIGATION_TIMEOUT,
    });

    // 等待用户名输入框加载完成
    Logger.info("等待用户名输入框加载...");
    await webPage.waitForSelector('input[name="text"]', {
      timeout: LOCAL_CONFIG.LOGIN_OPERATION_TIMEOUT,
    });

    // 填入用户账户名
    Logger.info("正在输入用户账户名...");
    await webPage.type('input[name="text"]', userAccountName, { delay: 100 });

    // 点击进入下一步按钮
    Logger.info("点击进入下一步...");
    await webPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      const nextButton = buttons.find(btn => btn.textContent.includes('下一步') || btn.textContent.includes('Next'));
      if (nextButton) nextButton.click();
    });

    // 等待密码输入框或邮箱验证界面加载
    Logger.info("等待密码输入或验证步骤加载...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 检查是否需要进行邮箱验证
    const emailVerificationInput = await webPage.$('input[name="text"]');
    if (emailVerificationInput && userEmail) {
      Logger.info("检测到邮箱验证步骤，正在输入验证邮箱...");
      await webPage.type('input[name="text"]', userEmail, { delay: 100 });
      await webPage.evaluate(() => {
         const buttons = Array.from(document.querySelectorAll('[role="button"]'));
         const nextButton = buttons.find(btn => btn.textContent.includes('下一步') || btn.textContent.includes('Next'));
         if (nextButton) nextButton.click();
       });
       await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 等待密码输入框加载
    Logger.info("等待密码输入框加载...");
    await webPage.waitForSelector('input[name="password"]', {
      timeout: LOCAL_CONFIG.LOGIN_OPERATION_TIMEOUT,
    });

    // 填入用户密码
    Logger.info("正在输入用户密码...");
    await webPage.type('input[name="password"]', userPassword, { delay: 100 });

    // 点击登录确认按钮
    Logger.info("点击登录确认按钮...");
    await webPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      const loginButton = buttons.find(btn => btn.textContent.includes('登录') || btn.textContent.includes('Log in'));
      if (loginButton) loginButton.click();
    });

    // 等待登录操作完成
    Logger.info("等待登录操作完成...");
    await webPage.waitForNavigation({ waitUntil: "networkidle2", timeout: LOCAL_CONFIG.LOGIN_OPERATION_TIMEOUT });
    
    // 检查是否登录成功（通过URL判断）
    const currentUrl = webPage.url();
    if (currentUrl.includes('home') || currentUrl === 'https://x.com/') {
      Logger.info('用户登录认证成功！');
      
      // 获取认证cookies数据
      Logger.info("正在获取认证cookies数据...");
      const authenticationCookies = await webPage.cookies();
      
      // 将cookies数据保存到本地文件
      Logger.info("正在保存cookies数据到本地文件...");
      const cookiesStoragePath = path.resolve(__dirname, LOCAL_CONFIG.COOKIES_FILE_PATH);
      fs.writeFileSync(cookiesStoragePath, JSON.stringify(authenticationCookies, null, 2));
      
      Logger.info(`认证Cookies已成功保存到: ${cookiesStoragePath}`);
      Logger.info(`共保存了 ${authenticationCookies.length} 个 cookies`);
      
      return true;
    } else {
      Logger.error('用户登录认证失败，当前页面:', { currentUrl });
      return false;
    }
    
  } catch (error) {
    Logger.error('用户登录认证失败:', { error: error.message });
    return false;
  } finally {
    if (browserInstance) {
      Logger.info('浏览器实例已关闭');
      await browserInstance.close();
    }
  }
}

/**
 * 从环境变量读取认证信息并执行登录
 * @returns {Promise<boolean>} 登录是否成功
 * @throws {Error} 环境变量缺失或登录失败时抛出
 */
async function authenticateFromEnvironmentVariables() {
  const environmentUsername = process.env.X_USERNAME;
  const environmentPassword = process.env.X_PASSWORD;
  const environmentEmail = process.env.X_EMAIL;
  
  if (!environmentUsername || !environmentPassword) {
    Logger.error('[登录] 缺少登录凭据');
    Logger.error('请在 .env 文件中设置 X_USERNAME 和 X_PASSWORD 环境变量');
    return false;
  }
  
  Logger.info(`使用环境变量进行用户认证: ${environmentUsername}`);
  return await authenticateAndSaveCookies(environmentUsername, environmentPassword, environmentEmail);
}

/**
 * 检查本地是否存在有效的认证Cookie
 * @returns {boolean} Cookie是否存在且有效
 */
function checkAuthenticationCookiesExist() {
  const cookiesStoragePath = path.resolve(__dirname, LOCAL_CONFIG.COOKIES_FILE_PATH);
  
  if (!fs.existsSync(cookiesStoragePath)) {
    Logger.info('[检查] cookies.json 文件不存在');
    return false;
  }
  
  try {
      const storedCookies = JSON.parse(fs.readFileSync(cookiesStoragePath, 'utf-8'));
      if (!Array.isArray(storedCookies) || storedCookies.length === 0) {
        Logger.warn('[检查] 认证cookies文件为空或格式错误');
        return false;
      }
      
      Logger.info(`[检查] 找到 ${storedCookies.length} 个有效cookies`);
      return true;
    } catch (error) {
      Logger.error('[检查] 认证cookies文件格式错误:', { error: error.message });
      return false;
    }
}

/**
 * 主执行函数 - 完整的认证流程管理
 * @returns {Promise<void>}
 */
async function executeAuthenticationProcess() {
  Logger.info('[启动] Twitter/X.com 自动登录认证脚本');
  
  // 检查是否已存在有效的认证cookies
  if (checkAuthenticationCookiesExist()) {
    Logger.info('[提示] 已存在有效cookies文件，如需重新登录请删除 cookies.json 文件');
    process.exit(0);
  }
  
  // 执行用户登录认证流程
  const authenticationSuccess = await authenticateFromEnvironmentVariables();
  
  if (authenticationSuccess) {
    Logger.info('[完成] 用户登录认证成功，cookies数据已保存');
    process.exit(0);
  } else {
    Logger.error('[失败] 用户登录认证失败');
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