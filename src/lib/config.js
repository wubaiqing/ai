/**
 * 应用配置管理模块
 * 统一管理环境变量和应用配置
 */

require('dotenv').config();

/**
 * 应用程序配置管理类
 * 负责管理所有环境变量和应用配置项
 */
class ApplicationConfiguration {
  constructor() {
    console.log('[配置] 开始初始化应用配置');
    this.validateRequiredEnvironmentVariables();
    console.log('[配置] 应用配置初始化完成');
  }

  /**
   * 验证必需的环境变量是否存在
   */
  validateRequiredEnvironmentVariables() {
    const requiredEnvironmentKeys = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    console.log('[配置] 验证环境变量...');
    const missingEnvironmentKeys = requiredEnvironmentKeys.filter(environmentKey => {
      const exists = !!process.env[environmentKey];
      if (!exists) {
        console.error(`[配置] 缺少环境变量: ${environmentKey}`);
      }
      return !exists;
    });

    if (missingEnvironmentKeys.length > 0) {
      console.error('[配置] 环境变量验证失败');
      console.error('[配置] 请检查 .env 文件是否包含以下变量:', missingEnvironmentKeys.join(', '));
      console.warn(`警告: 缺少必需的环境变量: ${missingEnvironmentKeys.join(', ')}`);
    }

    console.log('[配置] 环境变量验证通过');
  }

  /**
   * 获取 Twitter/X.com 平台相关配置
   */
  getTwitterConfiguration() {
    const config = {
      username: process.env.X_USERNAME,
      password: process.env.X_PASSWORD,
      email: process.env.X_EMAIL,
      cookiesFilePath: process.env.COOKIES_FILE || 'cookies.json'
    };
    
    // 不记录敏感信息，只记录配置状态
    console.log('[配置] X.com配置已加载');
    return config;
  }

  /**
   * 获取 Supabase 数据库配置
   */
  getSupabaseConfiguration() {
    const config = {
      databaseUrl: process.env.SUPABASE_URL,
      anonymousKey: process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    // 不记录敏感信息，只记录配置状态
    console.log('[配置] Supabase配置已加载');
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
