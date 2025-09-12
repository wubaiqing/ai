/**
 * 应用配置管理模块
 * 统一管理环境变量和应用配置
 */

require('dotenv').config();

class Config {
  constructor() {
    console.log('[配置] 开始初始化应用配置');
    this.validateEnvironment();
    console.log('[配置] 应用配置初始化完成');
  }

  /**
   * 验证必要的环境变量
   */
  validateEnvironment() {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
    ];

    console.log('[配置] 验证环境变量...');
    const missingVars = requiredVars.filter(varName => {
      const exists = !!process.env[varName];
      if (!exists) {
        console.error(`[配置] 缺少环境变量: ${varName}`);
      }
      return !exists;
    });

    if (missingVars.length > 0) {
      console.error('[配置] 环境变量验证失败');
      console.error('[配置] 请检查 .env 文件是否包含以下变量:', missingVars.join(', '));
      throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
    }

    console.log('[配置] 环境变量验证通过');
  }

  /**
   * 获取X.com相关配置
   */
  getTwitterConfig() {
    const config = {
    };
    
    // 不记录敏感信息，只记录配置状态
    console.log('[配置] X.com配置已加载');
    return config;
  }

  /**
   * 获取Supabase配置
   */
  getSupabaseConfig() {
    const config = {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    };
    
    // 不记录敏感信息，只记录配置状态
    console.log('[配置] Supabase配置已加载');
    return config;
  }

  /**
   * 获取服务器配置
   */
  getServerConfig() {
    return {
      port: process.env.PORT || 3001,
      host: process.env.HOST || 'localhost',
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * 获取调度器配置
   */
  getSchedulerConfig() {
    const config = {
      cronExpression: process.env.CRON_EXPRESSION || '0 * * * *', // 默认每小时执行
      timezone: process.env.TIMEZONE || 'Asia/Shanghai',
      enabled: process.env.SCHEDULER_ENABLED !== 'false', // 默认启用
    };
    
    console.log(`[配置] 调度器配置: ${config.cronExpression}, 时区: ${config.timezone}, 启用: ${config.enabled}`);
    return config;
  }

  /**
   * 获取所有配置
   */
  getAllConfig() {
    return {
      supabase: this.getSupabaseConfig(),
      server: this.getServerConfig(),
      scheduler: this.getSchedulerConfig(),
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

// 导出单例实例
module.exports = new Config();
