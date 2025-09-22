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

// 重试配置
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  PAGE_TIMEOUT: 30000,
  ELEMENT_TIMEOUT: 15000,
};

// 页面导航重试机制
async function navigateWithRetry(page, url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      Logger.info(`尝试导航到 ${url} (第${attempt + 1}次)...`);
      
      // 检查页面是否仍然连接
      if (page.isClosed()) {
        throw new Error('页面已关闭，无法导航');
      }
      
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      Logger.info('页面导航成功');
      return;
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
      
      if (attempt < maxRetries - 1) {
        const waitTime = isProtocolError ? 5000 : 3000;
        Logger.info(`等待 ${waitTime/1000} 秒后重试导航...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw new Error(`页面导航失败，已重试 ${maxRetries} 次: ${error.message}`);
      }
    }
  }
}

// 创建带重试机制的浏览器实例
async function createBrowserWithRetry(launchOptions) {
  for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      Logger.info(`尝试启动浏览器 (第${attempt + 1}次)...`);
      
      // 添加启动前等待时间，特别是在重试时
      if (attempt > 0) {
        const waitTime = RETRY_CONFIG.RETRY_DELAY * (attempt + 1);
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
        Logger.warn(`检测到协议错误 (第${attempt + 1}次): ${error.message}`);
      } else {
        Logger.warn(`浏览器启动失败 (第${attempt + 1}次): ${error.message}`);
      }
      
      if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
        const retryDelay = isProtocolError ? RETRY_CONFIG.RETRY_DELAY * 2 : RETRY_CONFIG.RETRY_DELAY;
        Logger.info(`等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw new Error(`浏览器启动失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次: ${error.message}`);
      }
    }
  }
}

// 创建带错误处理的页面实例
async function createPageWithErrorHandling(browser) {
  try {
    const page = await browser.newPage();
    
    // 设置超时
    page.setDefaultTimeout(RETRY_CONFIG.PAGE_TIMEOUT);
    page.setDefaultNavigationTimeout(RETRY_CONFIG.PAGE_TIMEOUT);
    
    // 监听页面错误
    page.on('error', (error) => {
      Logger.error(`页面错误: ${error.message}`);
    });
    
    page.on('pageerror', (error) => {
      Logger.error(`页面JavaScript错误: ${error.message}`);
    });
    
    return page;
  } catch (error) {
    Logger.error(`创建页面失败: ${error.message}`);
    throw error;
  }
}

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
    
    // Docker环境启动前额外等待
    Logger.info('Docker环境启动前等待...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 启动浏览器
    // 群辉NAS Docker环境优化配置
    const launchOptions = {
      headless: process.env.HEADLESS !== 'false',
      executablePath: LOCAL_CONFIG.CHROME_EXECUTABLE_PATH,
      timeout: 0,
      args: [
        // Docker环境必需参数
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        
        // 群辉NAS资源优化
        "--memory-pressure-off",
        "--max_old_space_size=512",
        "--single-process",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        
        // 精简功能配置
        "--no-first-run",
        "--disable-extensions",
        "--disable-notifications",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor,TranslateUI",
        "--disable-blink-features=AutomationControlled",
        "--disable-ipc-flooding-protection",
        "--disable-default-apps",
        "--disable-sync",
        "--headless=new"
      ],
      ignoreDefaultArgs: ["--enable-automation"],
      protocolTimeout: 180000, // 降低超时时间
      waitForInitialPage: false,
    };

    browserInstance = await createBrowserWithRetry(launchOptions);
    
    // 额外的连接稳定性检查
    Logger.info('执行连接稳定性检查...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 验证浏览器连接状态
    if (!browserInstance.isConnected()) {
      throw new Error('浏览器连接不稳定');
    }
    
    webPage = await createPageWithErrorHandling(browserInstance);
    
    // 页面创建后稳定性检查
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (webPage.isClosed()) {
      throw new Error('页面创建后立即关闭，连接不稳定');
    }
    
    await webPage.setViewport(LOCAL_CONFIG.BROWSER_VIEWPORT);
    await webPage.setUserAgent(APPLICATION_CONFIG.getUserAgent());

    Logger.info("正在导航到 Twitter/X.com 登录页面...");
    
    // 使用重试机制导航到登录页面
    let navigationSuccess = false;
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        await webPage.goto("https://x.com/i/flow/login", {
          waitUntil: "networkidle2",
          timeout: RETRY_CONFIG.PAGE_TIMEOUT,
        });
        navigationSuccess = true;
        break;
      } catch (error) {
        Logger.warn(`页面导航失败 (第${attempt + 1}次): ${error.message}`);
        if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
          Logger.info(`等待 ${RETRY_CONFIG.RETRY_DELAY}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY));
        }
      }
    }
    
    if (!navigationSuccess) {
      throw new Error(`登录页面导航失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次`);
    }

    // 等待用户名输入框加载完成
    Logger.info("等待用户名输入框加载...");
    
    // 使用重试机制等待用户名输入框
    let usernameInputFound = false;
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        await webPage.waitForSelector('input[name="text"]', {
          timeout: RETRY_CONFIG.ELEMENT_TIMEOUT,
        });
        usernameInputFound = true;
        break;
      } catch (error) {
        Logger.warn(`等待用户名输入框失败 (第${attempt + 1}次): ${error.message}`);
        if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
          Logger.info(`等待 ${RETRY_CONFIG.RETRY_DELAY}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY));
        }
      }
    }
    
    if (!usernameInputFound) {
      throw new Error(`用户名输入框加载失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次`);
    }

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
    
    // 使用重试机制等待密码输入框
    let passwordInputFound = false;
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        await webPage.waitForSelector('input[name="password"]', {
          timeout: RETRY_CONFIG.ELEMENT_TIMEOUT,
        });
        passwordInputFound = true;
        break;
      } catch (error) {
        Logger.warn(`等待密码输入框失败 (第${attempt + 1}次): ${error.message}`);
        if (attempt < RETRY_CONFIG.MAX_RETRIES - 1) {
          Logger.info(`等待 ${RETRY_CONFIG.RETRY_DELAY}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY));
        }
      }
    }
    
    if (!passwordInputFound) {
      throw new Error(`密码输入框加载失败，已重试 ${RETRY_CONFIG.MAX_RETRIES} 次`);
    }

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
    
    // 检查是否是Target closed错误
    if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
      Logger.warn('检测到浏览器连接错误，可能需要重启浏览器');
    }
    
    return false;
  } finally {
    // 确保浏览器被正确关闭
    try {
      if (browserInstance && browserInstance.isConnected()) {
        // 关闭所有页面
        const pages = await browserInstance.pages();
        await Promise.all(pages.map(page => {
          return page.close().catch(err => {
            Logger.warn(`关闭页面失败: ${err.message}`);
          });
        }));
        
        // 关闭浏览器
        await browserInstance.close();
        Logger.info('浏览器已正确关闭');
      }
    } catch (closeError) {
      Logger.error(`关闭浏览器时出错: ${closeError.message}`);
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
  console.log(`[${new Date().toISOString()}] [COOKIE-UPDATE-START] Twitter/X.com 自动登录认证脚本启动`);
  Logger.info('[启动] Twitter/X.com 自动登录认证脚本');
  
  // 检查是否已存在有效的认证cookies
  if (checkAuthenticationCookiesExist()) {
    console.log(`[${new Date().toISOString()}] [COOKIE-UPDATE-SKIP] 已存在有效cookies文件`);
    Logger.info('[提示] 已存在有效cookies文件，如需重新登录请删除 cookies.json 文件');
    process.exit(0);
  }
  
  // 执行用户登录认证流程
  const authenticationSuccess = await authenticateFromEnvironmentVariables();
  
  if (authenticationSuccess) {
    console.log(`[${new Date().toISOString()}] [COOKIE-UPDATE-SUCCESS] 用户登录认证成功，cookies数据已保存`);
    Logger.info('[完成] 用户登录认证成功，cookies数据已保存');
    process.exit(0);
  } else {
    console.error(`[${new Date().toISOString()}] [COOKIE-UPDATE-ERROR] 用户登录认证失败`);
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