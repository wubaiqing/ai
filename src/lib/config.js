/**
 * 应用程序配置管理模块
 * @module ApplicationConfiguration
 * @requires dotenv
 */

require('dotenv').config();
const Logger = require('./utils').Logger;

/**
 * 应用程序配置管理类
 * @class ApplicationConfiguration
 */
class ApplicationConfiguration {
  /**
   * 创建配置管理实例
   * @constructor
   */
  constructor() {
    Logger.info('[配置] 开始初始化应用配置');
    this.validateRequiredEnvironmentVariables();
    Logger.info('[配置] 应用配置初始化完成');
  }

  /**
   * 验证必需的环境变量
   * @throws {Error} 环境变量缺失时抛出错误
   */
  validateRequiredEnvironmentVariables() {
    const requiredEnvironmentKeys = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    Logger.info('[配置] 验证环境变量...');
    const missingEnvironmentKeys = requiredEnvironmentKeys.filter(environmentKey => {
      const exists = !!process.env[environmentKey];
      if (!exists) {
        Logger.error(`[配置] 缺少环境变量: ${environmentKey}`);
      }
      return !exists;
    });

    if (missingEnvironmentKeys.length > 0) {
      Logger.error('[配置] 环境变量验证失败');
      Logger.error('[配置] 请检查 .env 文件是否包含以下变量:', missingEnvironmentKeys.join(', '));
      Logger.warn(`警告: 缺少必需的环境变量: ${missingEnvironmentKeys.join(', ')}`);
    }

    Logger.info('[配置] 环境变量验证通过');
  }

  /**
   * 获取Twitter相关配置
   * @returns {Object} Twitter配置对象
   */
  getTwitterConfiguration() {
    const config = {
      username: process.env.X_USERNAME,
      password: process.env.X_PASSWORD,
      email: process.env.X_EMAIL,
      cookiesFilePath: process.env.COOKIES_FILE || 'cookies.json'
    };
    
    // 不记录敏感信息，只记录配置状态
    Logger.info('[配置] X.com配置已加载');
    return config;
  }

  /**
   * 获取Supabase数据库配置
   * @returns {Object} Supabase配置对象
   */
  getSupabaseConfiguration() {
    const config = {
      databaseUrl: process.env.SUPABASE_URL,
      anonymousKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    // 不记录敏感信息，只记录配置状态
    Logger.info('[配置] Supabase配置已加载');
    return config;
  }

  /**
   * 获取应用服务器配置
   */
  getServerConfiguration() {
    return {
      serverPort: process.env.PORT || 3000,
      serverHost: process.env.HOST || 'localhost',
      nodeEnvironment: process.env.NODE_ENV || 'development',
    };
  }



  /**
   * 获取数据爬取配置
   */
  getScrapingConfiguration() {
    return {
      maxScrollCount: parseInt(process.env.MAX_SCROLLS) || 10,
      scrollOperationTimeout: parseInt(process.env.SCROLL_TIMEOUT) || 2000,
      maxRetryAttempts: parseInt(process.env.MAX_RETRIES) || 3,
      isHeadlessMode: process.env.HEADLESS !== 'false'
    };
  }

  /**
   * 获取浏览器UserAgent配置
   * 统一管理所有浏览器实例使用的UserAgent
   */
  getUserAgent() {
    const defaultUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    return process.env.USER_AGENT || defaultUserAgent;
  }

  /**
   * 获取Chrome浏览器可执行文件路径
   * 适配不同环境的Chrome路径配置
   */
  getChromeExecutablePath() {
    // 群辉NAS Docker环境优化
    const defaultPath = process.platform === 'linux' 
      ? '/usr/bin/chromium-browser' 
      : process.env.CHROME_EXECUTABLE_PATH;
    
    return process.env.CHROME_EXECUTABLE_PATH || defaultPath;
  }

  /**
   * 获取完整应用配置
   */
  getAllApplicationConfiguration() {
    return {
      twitter: this.getTwitterConfiguration(),
      supabase: this.getSupabaseConfiguration(),
      server: this.getServerConfiguration(),
      scraping: this.getScrapingConfiguration()
    };
  }

  /**
   * 检查是否为生产环境
   */
  isProduction() {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment() {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }
}

// 创建并导出应用配置实例
const applicationConfig = new ApplicationConfiguration();
module.exports = applicationConfig;
