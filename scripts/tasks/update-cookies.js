/**
 * X.com 自动登录和Cookie保存脚本
 * @module TwitterAuthentication
 * @requires dotenv
 * @requires puppeteer
 * @requires fs
 * @requires path
 */

require("dotenv").config();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const APPLICATION_CONFIG = require("../core/lib/config");
const { Logger } = require("../core/lib/utils");
const { TimezoneUtils } = require("../core/lib/timezone");
const { handleCookieConsentWithRetry } = require("../core/lib/cookieConsent");

// 应用程序配置常量
const CONFIG = {
  CHROME_EXECUTABLE_PATH:
    process.env.CHROME_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
  COOKIES_FILE_PATH: APPLICATION_CONFIG.getTwitterConfiguration().cookiesFilePath,
  LOGIN_TIMEOUT: 30000,
  PAGE_TIMEOUT: 30000,
  ELEMENT_TIMEOUT: 15000,
  BROWSER_VIEWPORT: { width: 1280, height: 720 },
  DOCKER_STARTUP_DELAY: 2000,
  STABILITY_CHECK_DELAY: 1000,
  INPUT_DELAY: 100,
  CLICK_DELAY: 500,
};



/**
 * 睡眠函数
 * @param {number} ms - 睡眠时间（毫秒）
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 页面导航
 * @param {Object} page - Puppeteer页面对象
 * @param {string} url - 目标URL
 * @param {Object} options - 导航选项
 * @returns {Promise<void>}
 */
async function navigateTo(page, url, options = {}) {
  const { timeout = CONFIG.PAGE_TIMEOUT, waitUntil = "networkidle2" } = options;
  
  if (page.isClosed()) {
    throw new Error("页面已关闭，无法导航");
  }
  
  await page.goto(url, { waitUntil, timeout });
}

/**
 * 创建浏览器实例
 * @param {Object} launchOptions - Puppeteer启动选项
 * @returns {Promise<Object>} 浏览器实例
 */
async function createBrowser(launchOptions) {
  const browser = await puppeteer.launch(launchOptions);
  
  // 监听浏览器断开连接事件
  browser.on("disconnected", () => {
    Logger.warn("浏览器连接已断开");
  });
  
  // 连接稳定性检查
  await validateBrowserConnection(browser);
  
  return browser;
}

/**
 * 验证浏览器连接稳定性
 * @param {Object} browser - 浏览器实例
 * @returns {Promise<void>}
 */
async function validateBrowserConnection(browser) {
  try {
    const pages = await browser.pages();
    if (pages.length === 0) {
      await browser.newPage();
    }
    Logger.info("浏览器连接稳定性验证通过");
  } catch (error) {
    Logger.warn(`浏览器连接检查失败: ${error.message}`);
    await closeBrowserSafely(browser);
    throw error;
  }
}

/**
 * 创建带错误处理的页面实例
 * @param {Object} browser - 浏览器实例
 * @returns {Promise<Object>} 页面实例
 */
async function createPageWithErrorHandling(browser) {
  try {
    const page = await browser.newPage();
    
    // 设置超时
    page.setDefaultTimeout(CONFIG.PAGE_TIMEOUT);
    page.setDefaultNavigationTimeout(CONFIG.PAGE_TIMEOUT);
    
    // 配置代理认证（如果环境变量中存在）
    if (process.env.PROXY_HOST && process.env.PROXY_PORT && 
        process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
      Logger.info("配置代理认证...");
      await page.authenticate({
        username: process.env.PROXY_USERNAME,
        password: process.env.PROXY_PASSWORD
      });
      Logger.info("代理认证配置完成");
    }
    
    // 监听页面错误
    page.on("error", (error) => {
      Logger.error(`页面运行时错误: ${error.message}`);
    });
    
    page.on("pageerror", (error) => {
      Logger.error(`页面JavaScript错误: ${error.message}`);
    });
    
    return page;
  } catch (error) {
    Logger.error(`创建页面失败: ${error.message}`);
    throw error;
  }
}

/**
 * 安全关闭浏览器
 * @param {Object} browser - 浏览器实例
 * @returns {Promise<void>}
 */
async function closeBrowserSafely(browser) {
  if (!browser || !browser.isConnected()) {
    return;
  }
  
  try {
    const pages = await browser.pages();
    await Promise.all(
      pages.map(page => 
        page.close().catch(err => 
          Logger.warn(`关闭页面失败: ${err.message}`)
        )
      )
    );
    await browser.close();
    Logger.info("浏览器已安全关闭");
  } catch (error) {
    Logger.error(`关闭浏览器时出错: ${error.message}`);
  }
}

/**
 * 等待元素出现
 * @param {Object} page - 页面对象
 * @param {string} selector - 选择器
 * @param {Object} options - 等待选项
 * @returns {Promise<void>}
 */
async function waitForElement(page, selector, options = {}) {
  const { timeout = CONFIG.ELEMENT_TIMEOUT } = options;
  await page.waitForSelector(selector, { timeout });
}

/**
 * 执行X.com自动登录并保存认证Cookie
 * @param {string} userAccountName - 用户名或邮箱
 * @param {string} userPassword - 密码
 * @param {string} userEmail - 邮箱地址
 * @returns {Promise<boolean>} 登录是否成功
 * @throws {Error} 登录错误时抛出
 */
async function authenticateAndSaveCookies(
  userAccountName,
  userPassword,
  userEmail = null
) {
  let browserInstance = null;
  let webPage = null;

  try {
    Logger.info("正在启动浏览器实例...");

    // Docker环境启动前额外等待
    Logger.info("Docker环境启动前等待...");
    await sleep(CONFIG.DOCKER_STARTUP_DELAY);

    // 启动浏览器
    // 群辉NAS Docker环境优化配置
    const launchOptions = {
      headless: process.env.HEADLESS !== "false",
      executablePath: CONFIG.CHROME_EXECUTABLE_PATH,
      timeout: 0,
      args: [
        // Docker环境必需参数
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
      protocolTimeout: 180000, // 降低超时时间
      waitForInitialPage: false,
    };

    // HTTP代理将通过 page.authenticate() 方法配置
    if (process.env.PROXY_HOST && process.env.PROXY_PORT) {
      // 配置代理服务器（不包含认证信息）
      const proxyServer = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
      launchOptions.args.push(`--proxy-server=${proxyServer}`);
      Logger.info(`已配置HTTP代理服务器: ${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`);
    }

    browserInstance = await createBrowser(launchOptions);

    // 额外的连接稳定性检查
    Logger.info("执行连接稳定性检查...");
    await sleep(CONFIG.STABILITY_CHECK_DELAY);

    // 验证浏览器连接状态
    if (!browserInstance.isConnected()) {
      throw new Error("浏览器连接不稳定");
    }

    webPage = await createPageWithErrorHandling(browserInstance);

    // 页面创建后稳定性检查
    await sleep(500);

    if (webPage.isClosed()) {
      throw new Error("页面创建后立即关闭，连接不稳定");
    }

    await webPage.setViewport(CONFIG.BROWSER_VIEWPORT);
    await webPage.setUserAgent(APPLICATION_CONFIG.getUserAgent());

    Logger.info("正在导航到 Twitter/X.com 登录页面...");

    // 导航到登录页面
    await navigateTo(webPage, "https://x.com/i/flow/login");

    // 处理 cookie 同意弹窗
    Logger.info("检查并处理 cookie 同意弹窗...");
    await handleCookieConsentWithRetry(webPage, {
      maxRetries: 2,
      retryDelay: 1500,
      timeout: 5000,
      waitAfterClick: 1000
    });

    // 等待用户名输入框加载完成
    Logger.info("等待用户名输入框加载...");
    await waitForElement(webPage, 'input[name="text"]');

    // 填入用户账户名
    Logger.info("正在输入用户账户名...");
    await webPage.type('input[name="text"]', userAccountName, { delay: CONFIG.INPUT_DELAY });

    // 点击进入下一步按钮
    Logger.info("点击进入下一步...");
    await webPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      const nextButton = buttons.find(
        (btn) =>
          btn.textContent.includes("下一步") || btn.textContent.includes("Next")
      );
      if (nextButton) nextButton.click();
    });

    // 等待密码输入框或邮箱验证界面加载
    Logger.info("等待密码输入或验证步骤加载...");
    await sleep(2000);

    // 检查是否需要进行邮箱验证
    const emailVerificationInput = await webPage.$('input[name="text"]');
    if (emailVerificationInput && userEmail) {
      Logger.info("检测到邮箱验证步骤，正在输入验证邮箱...");
      await webPage.type('input[name="text"]', userEmail, { delay: CONFIG.INPUT_DELAY });
      await webPage.evaluate(() => {
        const buttons = Array.from(
          document.querySelectorAll('[role="button"]')
        );
        const nextButton = buttons.find(
          (btn) =>
            btn.textContent.includes("下一步") ||
            btn.textContent.includes("Next")
        );
        if (nextButton) nextButton.click();
      });
      await sleep(2000);
    }

    // 等待密码输入框加载
    Logger.info("等待密码输入框加载...");
    await waitForElement(webPage, 'input[name="password"]');

    // 填入用户密码
    Logger.info("正在输入用户密码...");
    await webPage.type('input[name="password"]', userPassword, { delay: CONFIG.INPUT_DELAY });

    // 点击登录确认按钮
    Logger.info("点击登录确认按钮...");
    await webPage.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"]'));
      const loginButton = buttons.find(
        (btn) =>
          btn.textContent.includes("登录") || btn.textContent.includes("Log in")
      );
      if (loginButton) loginButton.click();
    });

    // 等待登录操作完成
    Logger.info("等待登录操作完成...");
    await webPage.waitForNavigation({
      waitUntil: "networkidle2",
      timeout: CONFIG.LOGIN_TIMEOUT,
    });

    // 检查是否登录成功（通过URL判断）
    const currentUrl = webPage.url();
    if (currentUrl.includes("home") || currentUrl === "https://x.com/") {
      Logger.info("用户登录认证成功！");

      // 获取认证cookies数据
      Logger.info("正在获取认证cookies数据...");
      const authenticationCookies = await webPage.cookies();

      // 将cookies数据保存到本地文件
      Logger.info("正在保存cookies数据到本地文件...");
      const cookiesStoragePath = CONFIG.COOKIES_FILE_PATH;
      fs.writeFileSync(
        cookiesStoragePath,
        JSON.stringify(authenticationCookies, null, 2)
      );

      Logger.info(`认证Cookies已成功保存到: ${cookiesStoragePath}`);
      Logger.info(`共保存了 ${authenticationCookies.length} 个 cookies`);

      return true;
    } else {
      Logger.error("用户登录认证失败，当前页面:", { currentUrl });
      return false;
    }
  } catch (error) {
    Logger.error(`用户登录认证失败:`, { error: error.message });

    // 检查是否是Target closed错误
    if (
      error.message.includes("Target closed") ||
      error.message.includes("Protocol error")
    ) {
      Logger.warn("检测到浏览器连接错误，可能需要重启浏览器");
    }

    return false;
  } finally {
    await closeBrowserSafely(browserInstance);
    // 确保浏览器完全关闭后再继续
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    Logger.error("[登录] 缺少登录凭据");
    Logger.error("请在 .env 文件中设置 X_USERNAME 和 X_PASSWORD 环境变量");
    return false;
  }

  Logger.info(`使用环境变量进行用户认证: ${environmentUsername}`);
  return await authenticateAndSaveCookies(
    environmentUsername,
    environmentPassword,
    environmentEmail
  );
}

/**
 * 检查本地是否存在有效的认证Cookie
 * @returns {boolean} Cookie是否存在且有效
 */
function checkAuthenticationCookiesExist() {
  const cookiesStoragePath = CONFIG.COOKIES_FILE_PATH;

  if (!fs.existsSync(cookiesStoragePath)) {
    Logger.info("[检查] cookies.json 文件不存在");
    return false;
  }

  try {
    const storedCookies = JSON.parse(
      fs.readFileSync(cookiesStoragePath, "utf-8")
    );
    if (!Array.isArray(storedCookies) || storedCookies.length === 0) {
      Logger.warn("[检查] 认证cookies文件为空或格式错误");
      return false;
    }

    Logger.info(`[检查] 找到 ${storedCookies.length} 个有效cookies`);
    return true;
  } catch (error) {
    Logger.error("[检查] 认证cookies文件格式错误:", { error: error.message });
    return false;
  }
}

/**
 * 主执行函数 - 完整的认证流程管理
 * @returns {Promise<void>}
 */
async function executeAuthenticationProcess() {
  console.log(
    `[${TimezoneUtils.getTimestamp()}] [COOKIE-UPDATE-START] Twitter/X.com 自动登录认证脚本启动`
  );
  Logger.info("[启动] Twitter/X.com 自动登录认证脚本");

  try {
    // 检查是否已存在有效的认证cookies
    if (checkAuthenticationCookiesExist()) {
      console.log(
        `[${TimezoneUtils.getTimestamp()}] [COOKIE-UPDATE-SKIP] 已存在有效cookies文件`
      );
      Logger.info(
        "[提示] 已存在有效cookies文件，如需重新登录请删除 cookies.json 文件"
      );
      process.exit(0);
    }

    // 执行用户登录认证流程
    const authenticationSuccess = await authenticateFromEnvironmentVariables();

    if (authenticationSuccess) {
      console.log(
        `[${TimezoneUtils.getTimestamp()}] [COOKIE-UPDATE-SUCCESS] 用户登录认证成功，cookies数据已保存`
      );
      Logger.info("[完成] 用户登录认证成功，cookies数据已保存");
      process.exit(0);
    } else {
      console.error(
        `[${TimezoneUtils.getTimestamp()}] [COOKIE-UPDATE-ERROR] 用户登录认证失败`
      );
      Logger.error("[失败] 用户登录认证失败");
      process.exit(1);
    }
  } catch (error) {
    console.error(
      `[${TimezoneUtils.getTimestamp()}] [COOKIE-UPDATE-ERROR] 认证过程异常: ${error.message}`
    );
    Logger.error("[异常] 认证过程发生异常:", { error: error.message });
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行主认证流程
if (require.main === module) {
  executeAuthenticationProcess().catch(error => {
    console.error(
      `[${TimezoneUtils.getTimestamp()}] [COOKIE-UPDATE-ERROR] 脚本执行失败: ${error.message}`
    );
    Logger.error("[失败] 脚本执行失败:", { error: error.message });
    process.exit(1);
  });
}

// 导出函数供其他模块使用
module.exports = {
  authenticateAndSaveCookies,
  authenticateFromEnvironmentVariables,
  checkAuthenticationCookiesExist,
};
