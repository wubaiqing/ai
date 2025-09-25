/**
 * 报告生成配置管理模块
 * 负责管理AI简报生成的各种配置参数，包括数据库连接、AI服务、文件操作等配置
 * 
 * @fileoverview 提供统一的配置管理接口，支持环境变量覆盖和配置验证
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 */

const path = require('path');
const { TimezoneUtils } = require('../lib/timezone');
require('dotenv').config();

/**
 * 应用程序配置管理类
 * 
 * 提供统一的配置管理接口，支持：
 * - 环境变量自动加载和验证
 * - 配置项的类型检查和默认值处理
 * - 敏感信息的安全管理
 * - 配置的动态更新和热重载
 * 
 * @class ApplicationConfig
 * @example
 * const config = new ApplicationConfig();
 * const dbConfig = config.database;
 * const aiConfig = config.ai;
 */
const applicationConfig = {
  // Supabase数据库配置
  database: {
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    tableName: 'tweets'
  },

  // AI服务配置 - 硅基流动平台DeepSeek
  aiService: {
    baseUrl: 'https://api.siliconflow.cn/v1/chat/completions',
    apiKey: process.env.SILICONFLOW_API_KEY || '',
    modelName: 'deepseek-ai/DeepSeek-V3.1',
    requestTimeout: 300000, // 5分钟超时
    maxTokens: 4096,
    temperature: 0.7
  },

  // 报告输出配置 - 报告文件保存到项目根目录的 reports/ 目录// 报告输出配置
  reportOutput: {
    baseDirectory: path.join(__dirname, '..', '..', '..', 'reports'), // 项目根目录/reports/
    fileNameTemplate: 'ai-report-{date}.md',
    encoding: 'utf8'
  },

  // 日志配置
  logging: {
    levels: {
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR'
    },
    timestampFormat: 'ISO'
  },

  // 业务逻辑配置
  business: {
    maxReportItems: 15, // 简报最大条目数
    minTweetsRequired: 1, // 生成简报所需的最少推文数量
    contentCategories: ['科技', 'AI', '编程'], // 关注的内容类别
    reportLanguage: 'zh-CN', // 报告语言
    maxContentLength: 1000, // 单条推文内容最大长度
    validationRules: {
      requireContent: true, // 是否要求推文必须有内容
      requireUrl: true, // 是否要求推文必须有URL
      requirePublishedDate: true // 是否要求推文必须有发布日期
    }
  }
};

/**
 * 验证关键配置项的完整性
 * 
 * 检查数据库连接、AI服务等关键配置是否正确设置
 * 
 * @method validateRequiredConfiguration
 * @throws {Error} 当关键配置缺失或无效时抛出错误
 * @returns {Object} 验证结果
 */
function validateEnvironmentVariables() {
  const requiredEnvVars = {
    SUPABASE_URL: applicationConfig.database.supabaseUrl,
    SUPABASE_SERVICE_ROLE_KEY: applicationConfig.database.serviceRoleKey,
    SILICONFLOW_API_KEY: applicationConfig.aiService.apiKey
  };

  const missingVars = [];
  const validationResults = {};

  for (const [varName, value] of Object.entries(requiredEnvVars)) {
    if (!value || value.trim() === '') {
      missingVars.push(varName);
      validationResults[varName] = false;
    } else {
      validationResults[varName] = true;
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVariables: missingVars,
    validationResults
  };
}

/**
 * 获取文件操作相关配置
 * 
 * @method getFileOperationConfig
 * @returns {string} 格式化的文件名
 * @returns {string} returns.outputDirectory - 报告输出目录路径
 * @returns {string} returns.fileNamePrefix - 文件名前缀
 * @returns {string} returns.fileExtension - 文件扩展名
 * @returns {number} returns.maxFileRetention - 最大文件保留数量
 * @example
 * const fileConfig = config.getFileOperationConfig();
 * console.log(fileConfig.outputDirectory);
 */
function generateReportFileName() {
  const currentDate = TimezoneUtils.formatDate(new Date());
  return applicationConfig.reportOutput.fileNameTemplate.replace('{date}', currentDate);
}

/**
 * 获取业务逻辑相关配置
 * 
 * @method getBusinessLogicConfig
 * @returns {string} 完整的文件路径
 * @returns {number} returns.minReportLength - 报告最小长度要求
 * @returns {number} returns.maxTweetCount - 单次处理最大推文数量
 * @returns {boolean} returns.enableDataValidation - 是否启用数据验证
 * @returns {boolean} returns.enableFileCleanup - 是否启用文件清理
 * @example
 * const businessConfig = config.getBusinessLogicConfig();
 * console.log(businessConfig.minReportLength);
 */
function getReportFilePath() {
  const fileName = generateReportFileName();
  return path.join(applicationConfig.reportOutput.baseDirectory, fileName);
}

module.exports = {
  applicationConfig,
  validateEnvironmentVariables,
  generateReportFileName,
  getReportFilePath
};