require('dotenv').config();

/**
 * 应用配置管理
 */
class Config {
  constructor() {
    this.validateEnvironment();
  }

  /**
   * 验证必要的环境变量
   */
  validateEnvironment() {
    const requiredVars = [
      'X_TOKEN',
      'X_LIST_ID',
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
    }
  }

  /**
   * 获取X.com相关配置
   */
  getTwitterConfig() {
    return {
      token: process.env.X_TOKEN,
      listId: process.env.X_LIST_ID,
    };
  }

  /**
   * 获取Supabase配置
   */
  getSupabaseConfig() {
    return {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    };
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
    return {
      cronExpression: process.env.CRON_EXPRESSION || '0 * * * *', // 默认每小时执行
      timezone: process.env.TIMEZONE || 'Asia/Shanghai',
      enabled: process.env.SCHEDULER_ENABLED !== 'false', // 默认启用
    };
  }

  /**
   * 获取所有配置
   */
  getAllConfig() {
    return {
      twitter: this.getTwitterConfig(),
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
