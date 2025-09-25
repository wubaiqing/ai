/**
 * Cookie 同意弹窗处理工具
 * @module CookieConsentHandler
 * @requires Logger
 */

const { Logger } = require('./utils');

/**
 * 处理页面上的 cookie 同意弹窗
 * @param {Object} page - Puppeteer 页面对象
 * @param {Object} options - 配置选项
 * @param {number} options.timeout - 等待超时时间（毫秒）
 * @param {number} options.waitAfterClick - 点击后等待时间（毫秒）
 * @returns {Promise<boolean>} 是否成功处理了 cookie 弹窗
 */
async function handleCookieConsent(page, options = {}) {
  const {
    timeout = 5000,
    waitAfterClick = 1000
  } = options;

  try {
    Logger.info('正在检查 cookie 同意弹窗...');

    // 等待页面稳定
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 在页面中查找并点击 cookie 同意按钮
    const cookieHandled = await page.evaluate(() => {
      // 常见的 cookie 同意按钮文本（多语言支持）
      const acceptTexts = [
        'Accept all cookies',
        'Accept all',
        'Accept cookies',
        'Accept',
        'Allow all cookies',
        'Allow all',
        'Allow cookies',
        'I accept',
        'Agree',
        'OK',
        '同意所有',
        '接受所有',
        '同意所有 Cookie',
        '接受所有 Cookie',
        '同意',
        '接受',
        '允许所有',
        '允许',
        '确定',
        'Accepter tous les cookies',
        'Accepter tout',
        'Alle Cookies akzeptieren',
        'Alle akzeptieren',
        'Aceptar todas las cookies',
        'Aceptar todo'
      ];

      // 常见的 cookie 弹窗选择器
      const selectors = [
        // 通用按钮选择器
        'button[data-testid*="cookie"]',
        'button[data-testid*="accept"]',
        'button[id*="cookie"]',
        'button[id*="accept"]',
        'button[class*="cookie"]',
        'button[class*="accept"]',
        // 特定网站选择器
        '[data-testid="BottomBar"] [role="button"]', // Twitter/X.com
        '.cookie-banner button',
        '.cookie-consent button',
        '.gdpr-banner button',
        '#cookie-banner button',
        '#cookie-consent button',
        // 通用角色选择器
        '[role="button"]',
        'button',
        'a[role="button"]'
      ];

      let buttonFound = false;
      let clickedButton = null;

      // 遍历所有选择器查找匹配的按钮
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          
          for (const element of elements) {
            const text = element.textContent?.trim() || '';
            const ariaLabel = element.getAttribute('aria-label') || '';
            const title = element.getAttribute('title') || '';
            const allText = `${text} ${ariaLabel} ${title}`.toLowerCase();

            // 检查是否包含接受 cookie 的文本
            const isAcceptButton = acceptTexts.some(acceptText => 
              allText.includes(acceptText.toLowerCase()) ||
              text.toLowerCase().includes(acceptText.toLowerCase())
            );

            if (isAcceptButton) {
              // 检查按钮是否可见且可点击
              const rect = element.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0 && 
                               window.getComputedStyle(element).visibility !== 'hidden' &&
                               window.getComputedStyle(element).display !== 'none';

              if (isVisible) {
                try {
                  // 阻止事件冒泡和默认行为
                  element.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }, { once: true, capture: true });
                  
                  element.click();
                  buttonFound = true;
                  clickedButton = {
                    text: text,
                    selector: selector,
                    tagName: element.tagName
                  };
                  break;
                } catch (clickError) {
                  console.warn(`点击按钮失败: ${clickError.message}`);
                  continue;
                }
              }
            }
          }
          
          if (buttonFound) break;
        } catch (selectorError) {
          console.warn(`选择器 ${selector} 查找失败: ${selectorError.message}`);
          continue;
        }
      }

      return {
        found: buttonFound,
        button: clickedButton
      };
    });

    if (cookieHandled.found) {
      Logger.info(`成功点击 cookie 同意按钮: "${cookieHandled.button.text}" (${cookieHandled.button.tagName})`);
      
      // 点击后等待页面响应
      await new Promise(resolve => setTimeout(resolve, waitAfterClick));
      
      return true;
    } else {
      Logger.info('未发现 cookie 同意弹窗或按钮不可点击');
      return false;
    }

  } catch (error) {
    Logger.warn(`处理 cookie 同意弹窗时出错: ${error.message}`);
    return false;
  }
}

/**
 * 带重试机制的 cookie 同意处理
 * @param {Object} page - Puppeteer 页面对象
 * @param {Object} options - 配置选项
 * @param {number} options.maxRetries - 最大重试次数
 * @param {number} options.retryDelay - 重试间隔时间（毫秒）
 * @param {number} options.timeout - 单次尝试超时时间（毫秒）
 * @param {number} options.waitAfterClick - 点击后等待时间（毫秒）
 * @returns {Promise<boolean>} 是否成功处理了 cookie 弹窗
 */
async function handleCookieConsentWithRetry(page, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    timeout = 5000,
    waitAfterClick = 1000
  } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      Logger.info(`尝试处理 cookie 同意弹窗 (第${attempt + 1}次)...`);
      
      const result = await handleCookieConsent(page, { timeout, waitAfterClick });
      
      if (result) {
        Logger.info('cookie 同意弹窗处理成功');
        return true;
      }
      
      if (attempt < maxRetries - 1) {
        Logger.info(`等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
      
    } catch (error) {
      Logger.warn(`第${attempt + 1}次尝试失败: ${error.message}`);
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  Logger.info(`经过 ${maxRetries} 次尝试，未能处理 cookie 同意弹窗`);
  return false;
}

module.exports = {
  handleCookieConsent,
  handleCookieConsentWithRetry
};