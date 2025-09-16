/**
 * 报告生成器模块
 * 
 * 核心业务逻辑模块，提供完整的报告生成流程：
 * - 协调数据获取、AI分析、文件保存等服务
 * - 管理报告生成的完整生命周期
 * - 提供错误处理和状态监控
 * - 支持批量处理和异步操作
 * - 实现业务规则和数据验证
 * 
 * @fileoverview 报告生成的主要业务逻辑层，整合所有服务模块
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 * @requires ./tweetService.js
 * @requires ./aiService.js
 * @requires ./fileService.js
 * @requires ../utils.js
 */

const { tweetDataService } = require('../services/tweetService');
const { aiContentService } = require('../services/aiService');
const { fileOperationService } = require('../services/fileService');
const { applicationConfig } = require('./reportConfig');
const { Logger, TimeUtils, ValidationUtils, ErrorHandler, DataFormatter } = require('../lib/utils');

/**
 * 报告生成器管理类
 * 
 * 提供完整的报告生成服务，包括：
 * - 数据收集和预处理
 * - AI内容生成和优化
 * - 报告格式化和验证
 * - 文件保存和管理
 * - 错误处理和重试机制
 * - 生成状态监控和日志
 * 
 * @class ReportGenerationManager
 * @example
 * const generator = new ReportGenerationManager();
 * const result = await generator.generateDailyReport();
 * console.log('报告生成完成:', result.filePath);
 */
class AIReportGenerator {
  /**
   * 构造报告生成器实例
   * 
   * 初始化所有依赖的服务模块，建立服务间的协调机制
   * 
   * @constructor
   * @throws {Error} 当服务初始化失败时抛出错误
   * @example
   * const generator = new ReportGenerationManager();
   * // 自动初始化推文服务、AI服务、文件服务等
   */
  constructor() {
    this.tweetService = tweetDataService;
    this.aiService = aiContentService;
    this.fileService = fileOperationService;
    this.config = applicationConfig;
  }

  /**
   * 生成当日推文简报
   * 
   * 执行完整的报告生成流程：获取推文数据 → AI分析 → 生成报告 → 保存文件
   * 
   * @async
   * @method generateDailyReport
   * @param {Object} [generationOptions] - 生成选项
   * @returns {Promise<Object>} 报告生成结果
   * @returns {Promise<{success: boolean, filePath: string, reportContent: string, tweetCount: number, generationTime: number}>} 生成结果详情
   * @throws {Error} 当报告生成过程中出现错误时抛出错误
   * @example
   * const result = await generator.generateDailyReport();
   * if (result.success) {
   *   console.log(`报告已保存到: ${result.filePath}`);
   *   console.log(`处理了 ${result.tweetCount} 条推文`);
   * }
   */
  async generateCompleteReport(generationOptions = {}) {
    const processStartTime = Date.now();
    Logger.info('开始生成AI简报...');
    
    try {
      // 1. 获取今日推文数据
      const todayTweetData = await this.fetchTodayTweetData();
      
      // 2. 验证数据完整性
      this.validateTweetDataIntegrity(todayTweetData);
      
      // 3. 预处理和标准化数据
      const normalizedTweetData = this.preprocessAndNormalizeTweetData(todayTweetData);
      
      // 4. 生成智能报告内容
      const intelligentReportContent = await this.generateIntelligentReportContent(normalizedTweetData);
      
      // 5. 保存生成的报告
      const savedFilePath = await this.saveGeneratedReport(intelligentReportContent, {
        metadata: {
          tweetsCount: normalizedTweetData.length,
          generationTime: new Date(),
          dataSource: 'tweets_table'
        }
      });
      
      // 6. 生成执行摘要
      const executionSummary = this.createExecutionSummary({
        startTime: processStartTime,
        endTime: Date.now(),
        tweetsCount: normalizedTweetData.length,
        savedFilePath,
        reportLength: intelligentReportContent.length
      });
      
      Logger.info('AI简报生成完成', executionSummary);
      
      return {
        success: true,
        filePath: savedFilePath,
        summary: executionSummary,
        reportContent: intelligentReportContent,
        metadata: {
          tweetsProcessed: normalizedTweetData.length,
          generationDuration: executionSummary.duration,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      Logger.error('生成AI简报失败', { error: error.message, stack: error.stack });
      
      return {
        success: false,
        error: error.message,
        errorCode: error.code || 'REPORT_GENERATION_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 获取今日推文数据
   * @returns {Promise<Array>} 推文数据数组
   * @private
   */
  async fetchTodayTweetData() {
    try {
      Logger.info('开始获取今日推文数据...');
      
      const todayTweets = await this.tweetService.fetchTodayTweetCollection();
      
      Logger.info(`成功获取 ${todayTweets.length} 条推文数据`);
      
      return todayTweets;
    } catch (error) {
      Logger.error('获取推文数据失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证推文数据的有效性
   * @param {Array} tweetDataCollection - 推文数据数组
   * @returns {Array} 验证后的推文数据
   * @private
   */
  validateTweetDataIntegrity(tweetDataCollection) {
    const validationResult = this.tweetService.validateTweetDataIntegrity(tweetDataCollection);
    
    if (!validationResult.isDataValid) {
      Logger.warn('推文数据验证失败', { message: validationResult.validationMessage });
      throw ErrorHandler.createStandardizedError(
        '没有找到今日推文数据，无法生成简报',
        'NO_TWEETS_FOUND'
      );
    }
    
    Logger.info(`验证推文数据完成，共 ${tweetDataCollection.length} 条有效推文`);
    
    return validationResult.validatedTweets;
  }

  /**
   * 使用AI生成智能简报内容
   * @param {Array} processedTweetData - 预处理后的推文数据
   * @returns {Promise<string>} 生成的报告内容
   * @private
   */
  async generateIntelligentReportContent(processedTweetData) {
    try {
      Logger.info('开始生成AI简报内容...');
      
      const intelligentReportContent = await this.aiService.analyzeTweetsAndGenerateReport(processedTweetData);
      
      if (ValidationUtils.isEmptyOrWhitespace(intelligentReportContent)) {
      throw ErrorHandler.createStandardizedError(
          'AI服务返回的简报内容为空',
          'EMPTY_REPORT_CONTENT'
        );
      }
      
      Logger.info('AI简报内容生成完成');
      
      return intelligentReportContent;
    } catch (error) {
      Logger.error('生成简报内容失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 预处理和标准化推文数据
   * @param {Array} rawTweetCollection - 原始推文数据
   * @returns {Array} 处理后的推文数据
   * @private
   */
  preprocessAndNormalizeTweetData(rawTweetCollection) {
    try {
      Logger.info('开始预处理推文数据...');
      
      const normalizedTweets = rawTweetCollection.map(tweetItem => ({
        ...tweetItem,
        content: DataFormatter.sanitizeTextForHtml(tweetItem.content),
        published_date: TimeUtils.formatDateTimeToLocalizedString(new Date(tweetItem.published_date))
      }));
      
      Logger.info(`推文数据预处理完成，处理了 ${normalizedTweets.length} 条推文`);
      
      return normalizedTweets;
    } catch (error) {
      Logger.error('推文数据预处理失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证生成报告的质量和完整性
   * 
   * 检查报告内容的长度、格式、结构等，确保符合业务要求
   * 
   * @private
   * @method validateReportQuality
   * @param {string} generatedContent - AI生成的内容
   * @throws {Error} 当内容无效时抛出错误
   * @example
   * // 内部使用，验证AI生成的报告质量
   * const validation = this.validateReportQuality(aiReport);
   * if (!validation.isValid) {
   *   console.log('报告质量问题:', validation.issues);
   * }
   */
  validateGeneratedContentQuality(generatedContent) {
    if (!ValidationUtils.isValidNonEmptyString(generatedContent)) {
      throw ErrorHandler.createStandardizedError(
        'AI生成的内容为空或无效',
        'INVALID_GENERATED_CONTENT'
      );
    }
    
    const minimumContentLength = this.config.business.minReportLength || 100;
    if (generatedContent.length < minimumContentLength) {
      throw ErrorHandler.createStandardizedError(
        `生成的内容过短: ${generatedContent.length} < ${minimumContentLength}`,
        'CONTENT_TOO_SHORT'
      );
    }
    
    Logger.info('AI生成内容质量验证通过');
  }

  /**
   * 保存生成的报告
   * @param {string} reportContent - 报告内容
   * @param {Object} options - 保存选项
   * @returns {Promise<string>} 保存的文件路径
   */
  async saveGeneratedReport(reportContent, options = {}) {
    try {
      Logger.info('开始保存生成的报告...');
      
      const savedFilePath = await this.fileService.saveReportToFile(
        reportContent,
        options
      );
      
      Logger.info(`报告保存成功: ${savedFilePath}`);
      
      return savedFilePath;
      
    } catch (error) {
      Logger.error('保存报告失败', { error: error.message });
      throw ErrorHandler.createStandardizedError(
        `保存报告失败: ${error.message}`,
        'REPORT_SAVE_ERROR',
        error
      );
    }
  }

  /**
   * 创建执行摘要
   * @param {Object} executionData - 执行数据
   * @returns {Object} 执行摘要
   */
  createExecutionSummary(executionData) {
    const duration = executionData.endTime - executionData.startTime;
    
    return {
      duration: `${(duration / 1000).toFixed(2)}秒`,
      tweetsProcessed: executionData.tweetsCount,
      reportLength: `${(executionData.reportLength / 1024).toFixed(2)}KB`,
      outputFile: executionData.savedFilePath,
      timestamp: TimeUtils.formatDateTimeToLocalizedString(new Date()),
      status: 'success'
    };
  }

  /**
   * 获取生成统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getGenerationStatistics() {
    try {
      Logger.info('获取生成统计信息...');
      
      // 获取数据库统计
      const dbStats = await this.tweetService.getTweetStatistics();
      
      // 获取文件统计
      const reportFiles = await this.fileService.listReportFiles();
      
      const statistics = {
        database: {
          totalTweets: dbStats.totalTweetCount,
          todayTweets: dbStats.todayTweetCount,
          lastUpdateTime: dbStats.statisticsDate
        },
        reports: {
          totalReports: reportFiles.length,
          latestReport: reportFiles[0] || null,
          oldestReport: reportFiles[reportFiles.length - 1] || null
        },
        system: {
          configVersion: this.config.version || '1.0.0',
          lastGenerationTime: new Date().toISOString()
        }
      };
      
      Logger.info('统计信息获取成功');
      
      return statistics;
      
    } catch (error) {
      Logger.error('获取统计信息失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 清理资源和旧文件
   * @param {Object} [options] - 清理选项
   * @returns {Promise<Object>} 清理结果
   */
  async performCleanup(options = {}) {
    try {
      Logger.info('开始执行清理操作...');
      
      const keepReportsCount = options.keepReportsCount || this.config.businessLogic.maxReportsToKeep;
      
      // 清理旧报告文件
      const deletedFiles = await this.fileService.cleanupExpiredReportFiles(keepReportsCount);
      
      const cleanupResult = {
        deletedReportsCount: deletedFiles.length,
        deletedFiles: deletedFiles,
        timestamp: new Date().toISOString()
      };
      
      Logger.info('清理操作完成', cleanupResult);
      
      return cleanupResult;
      
    } catch (error) {
      Logger.error('清理操作失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 健康检查
   * @returns {Promise<Object>} 健康状态
   */
  async performHealthCheck() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      services: {},
      overall: 'healthy'
    };
    
    try {
      // 检查数据库连接
      try {
        await this.tweetService.validateConnection();
        healthStatus.services.database = 'healthy';
      } catch (error) {
        healthStatus.services.database = 'unhealthy';
        healthStatus.overall = 'degraded';
        Logger.warn('数据库连接检查失败', { error: error.message });
      }
      
      // 检查AI服务
      try {
        this.aiService.validateConfiguration();
        healthStatus.services.aiService = 'healthy';
      } catch (error) {
        healthStatus.services.aiService = 'unhealthy';
        healthStatus.overall = 'degraded';
        Logger.warn('AI服务配置检查失败', { error: error.message });
      }
      
      // 检查文件系统
      try {
        await this.fileService.ensureDirectoryExists();
        healthStatus.services.fileSystem = 'healthy';
      } catch (error) {
        healthStatus.services.fileSystem = 'unhealthy';
        healthStatus.overall = 'degraded';
        Logger.warn('文件系统检查失败', { error: error.message });
      }
      
      Logger.info('健康检查完成', healthStatus);
      
      return healthStatus;
      
    } catch (error) {
      Logger.error('健康检查失败', { error: error.message });
      
      return {
        ...healthStatus,
        overall: 'unhealthy',
        error: error.message
      };
    }
  }
}

// 创建单例实例
const aiReportGenerator = new AIReportGenerator();

module.exports = {
  AIReportGenerator,
  aiReportGenerator
};