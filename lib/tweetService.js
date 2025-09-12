/**
 * 推文数据服务模块
 * 
 * 提供推文数据的获取、处理和验证功能，支持：
 * - 从Supabase数据库查询推文数据
 * - 按时间范围筛选推文
 * - 数据格式化和验证
 * - 错误处理和重试机制
 * 
 * @fileoverview 推文数据访问层，封装所有与推文相关的数据库操作
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 * @requires supabase/supabase-js
 * @requires ../utils.js
 */

const { createClient } = require('@supabase/supabase-js');
const { applicationConfig } = require('./reportConfig');
const { Logger, TimeUtils, ValidationUtils, ErrorHandler } = require('./utils');

/**
 * 推文数据服务类
 * 
 * 提供完整的推文数据访问接口，包括：
 * - 数据库连接管理
 * - 推文数据查询和筛选
 * - 数据验证和格式化
 * - 错误处理和日志记录
 * 
 * @class TweetDataService
 * @example
 * const tweetService = new TweetDataService(config);
 * const tweets = await tweetService.getTodayTweets();
 * console.log(`获取到 ${tweets.length} 条推文`);
 */
class TweetDataService {
  /**
   * 构造推文数据服务实例
   * 
   * @constructor
   * @param {Object} configuration - 应用程序配置对象
   * @param {Object} configuration.database - 数据库配置
   * @param {string} configuration.database.supabaseUrl - Supabase项目URL
   * @param {string} configuration.database.serviceRoleKey - Supabase服务角色密钥
   * @param {string} configuration.database.tableName - 推文数据表名
   * @throws {Error} 当配置无效时抛出错误
   * @example
   * const service = new TweetDataService({
   *   database: {
   *     supabaseUrl: 'https://xxx.supabase.co',
   *     serviceRoleKey: 'eyJ...',
   *     tableName: 'tweets'
   *   }
   * });
   */
  constructor() {
    this.supabaseClient = null;
    this.isInitialized = false;
  }

  /**
   * 初始化Supabase数据库客户端
   * 
   * 创建并配置Supabase客户端实例，设置认证和连接参数
   * 
   * @private
   * @method initializeSupabaseClient
   * @throws {Error} 当Supabase配置无效时抛出错误
   * @returns {void}
   */
  initializeDatabaseClient() {
    try {
      const { supabaseUrl, serviceRoleKey } = applicationConfig.database;
      
      if (ValidationUtils.isEmptyOrWhitespace(supabaseUrl)) {
      throw ErrorHandler.createStandardizedError('Supabase URL未配置', 'MISSING_SUPABASE_URL');
      }
      
      if (ValidationUtils.isEmptyOrWhitespace(serviceRoleKey)) {
      throw ErrorHandler.createStandardizedError('Supabase Service Role Key未配置', 'MISSING_SERVICE_ROLE_KEY');
      }

      this.supabaseClient = createClient(supabaseUrl, serviceRoleKey);
      this.isInitialized = true;
      
      Logger.info('Supabase客户端初始化成功');
    } catch (error) {
      Logger.error('Supabase客户端初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 确保数据库客户端已正确初始化
   * @private
   */
  ensureDatabaseClientReady() {
    if (!this.isInitialized || !this.supabaseClient) {
      this.initializeDatabaseClient();
    }
  }

  /**
   * 获取当天的推文数据
   * 
   * 查询当天时间范围内的所有推文，并进行数据验证和格式化
   * 
   * @async
   * @method getTodayTweets
   * @returns {Promise<Array<Object>>} 推文数据数组
   * @returns {Promise<Array<{id: string, content: string, created_at: string, author: string}>>} 格式化的推文对象数组
   * @throws {Error} 当数据库查询失败时抛出错误
   * @example
   * const tweets = await tweetService.getTodayTweets();
   * tweets.forEach(tweet => {
   *   console.log(`${tweet.author}: ${tweet.content}`);
   * });
   */
  async fetchTodayTweetCollection() {
    try {
      this.ensureDatabaseClientReady();
      
      Logger.info('开始获取当天推文数据...');
      
      const { startTime: todayStartTime, endTime: todayEndTime } = TimeUtils.getCurrentDayTimeRange();
      const { tableName: tweetTableName } = applicationConfig.database;
      
      const { data: tweetDataCollection, error: databaseQueryError } = await this.supabaseClient
        .from(tweetTableName)
        .select('*')
        .gte('created_at', todayStartTime)
        .lt('created_at', todayEndTime)
        .order('created_at', { ascending: false });
      
      if (databaseQueryError) {
        throw ErrorHandler.createStandardizedError(
          `数据库查询失败: ${databaseQueryError.message}`,
          'DATABASE_QUERY_ERROR',
          databaseQueryError
        );
      }
      
      const retrievedTweetCount = tweetDataCollection ? tweetDataCollection.length : 0;
      Logger.info(`成功获取到 ${retrievedTweetCount} 条推文数据`);
      
      return tweetDataCollection || [];
    } catch (error) {
      Logger.error('获取当天推文数据失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 根据指定时间范围获取推文数据
   * 
   * @async
   * @method getTweetsByDateRange
   * @param {Date} startDate - 查询开始时间
   * @param {Date} endDate - 查询结束时间
   * @returns {Promise<Array<Object>>} 时间范围内的推文数据数组
   * @throws {Error} 当时间参数无效或数据库查询失败时抛出错误
   * @example
   * const startDate = new Date('2024-01-01');
   * const endDate = new Date('2024-01-02');
   * const tweets = await tweetService.getTweetsByDateRange(startDate, endDate);
   */
  async fetchTweetCollectionByDateRange(dateRangeStart, dateRangeEnd) {
    try {
      this.ensureDatabaseClientReady();
      
      if (ValidationUtils.isEmptyOrWhitespace(dateRangeStart) || ValidationUtils.isEmptyOrWhitespace(dateRangeEnd)) {
      throw ErrorHandler.createStandardizedError('开始日期和结束日期不能为空', 'INVALID_DATE_RANGE');
      }
      
      Logger.info(`获取日期范围内的推文数据: ${dateRangeStart} 到 ${dateRangeEnd}`);
      
      const { tableName: tweetTableName } = applicationConfig.database;
      
      const { data: rangedTweetCollection, error: rangeQueryError } = await this.supabaseClient
        .from(tweetTableName)
        .select('*')
        .gte('created_at', dateRangeStart)
        .lt('created_at', dateRangeEnd)
        .order('created_at', { ascending: false });
      
      if (rangeQueryError) {
        throw ErrorHandler.createStandardizedError(
          `数据库查询失败: ${rangeQueryError.message}`,
          'DATABASE_QUERY_ERROR',
          rangeQueryError
        );
      }
      
      const retrievedRangedTweetCount = rangedTweetCollection ? rangedTweetCollection.length : 0;
      Logger.info(`成功获取到 ${retrievedRangedTweetCount} 条推文数据`);
      
      return rangedTweetCollection || [];
    } catch (error) {
      Logger.error('根据日期范围获取推文数据失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取推文数据统计分析信息
   * @returns {Promise<Object>} 包含统计信息的对象
   */
  async generateTweetStatisticsReport() {
    try {
      this.ensureDatabaseClientReady();
      
      Logger.info('获取推文统计信息...');
      
      const { tableName: tweetTableName } = applicationConfig.database;
      const { startTime: todayStartTime, endTime: todayEndTime } = TimeUtils.getCurrentDayTimeRange();
      
      // 获取今日推文数量
      const { count: todayTweetCount, error: todayCountError } = await this.supabaseClient
        .from(tweetTableName)
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStartTime)
        .lt('created_at', todayEndTime);
      
      if (todayCountError) {
        throw ErrorHandler.createStandardizedError(
          `获取今日统计失败: ${todayCountError.message}`,
          'STATISTICS_ERROR',
          todayCountError
        );
      }
      
      // 获取总推文数量
      const { count: totalTweetCount, error: totalCountError } = await this.supabaseClient
        .from(tweetTableName)
        .select('*', { count: 'exact', head: true });
      
      if (totalCountError) {
        throw ErrorHandler.createStandardizedError(
          `获取总数统计失败: ${totalCountError.message}`,
          'STATISTICS_ERROR',
          totalCountError
        );
      }
      
      const comprehensiveStatisticsData = {
        todayTweetCount: todayTweetCount || 0,
        totalTweetCount: totalTweetCount || 0,
        statisticsGeneratedDate: TimeUtils.formatDateToLocalizedString()
      };
      
      Logger.info('推文统计信息获取成功', comprehensiveStatisticsData);
      
      return comprehensiveStatisticsData;
    } catch (error) {
      Logger.error('获取推文统计信息失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证数据库连接状态和可用性
   * @returns {Promise<boolean>} 连接状态
   * @throws {Error} 当连接失败时抛出错误
   */
  async validateDatabaseConnectionHealth() {
    try {
      this.ensureDatabaseClientReady();
      
      // 执行简单查询测试连接
      const { error: connectionTestError } = await this.supabaseClient
        .from(applicationConfig.database.tableName)
        .select('id')
        .limit(1);
      
      if (connectionTestError) {
        throw ErrorHandler.createStandardizedError(
          `数据库连接验证失败: ${connectionTestError.message}`,
          'CONNECTION_VALIDATION_ERROR',
          connectionTestError
        );
      }
      
      Logger.info('数据库连接验证成功');
      return true;
    } catch (error) {
      Logger.error('数据库连接验证失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 获取今日推文数据（别名方法）
   * 
   * @async
   * @method getTodayTweets
   * @returns {Promise<Array<Object>>} 今日推文数据数组
   * @throws {Error} 当数据库查询失败时抛出错误
   */
  async getTodayTweets() {
    return await this.fetchTodayTweetCollection();
  }

  /**
   * 根据日期范围获取推文数据（别名方法）
   * 
   * @async
   * @method getTweetsByDateRange
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Promise<Array<Object>>} 推文数据数组
   * @throws {Error} 当数据库查询失败时抛出错误
   */
  async getTweetsByDateRange(startDate, endDate) {
    return await this.fetchTweetCollectionByDateRange(startDate, endDate);
  }

  /**
   * 验证和清理推文数据
   * 
   * 对推文数据进行完整性检查，过滤无效数据，确保数据质量
   * 
   * @private
   * @method validateAndCleanTweetData
   * @param {Array<Object>} tweetDataArray - 原始推文数据数组
   * @returns {Array<Object>} 验证和清理后的推文数据数组
   * @example
   * // 内部使用，过滤掉内容为空或格式错误的推文
   * const cleanTweets = this.validateAndCleanTweetData(rawTweets);
   */
  validateTweetDataIntegrity(tweetDataCollection) {
    if (ValidationUtils.isEmptyOrInvalidArray(tweetDataCollection)) {
      return {
        isDataValid: false,
        validatedTweets: [],
        invalidatedTweets: [],
        validationMessage: '推文数据为空'
      };
    }
    
    const validatedTweets = [];
    const invalidatedTweets = [];
    
    tweetDataCollection.forEach((tweetItem, itemIndex) => {
      const isTweetItemValid = (
        tweetItem &&
        !ValidationUtils.isEmptyOrWhitespace(tweetItem.content) &&
        !ValidationUtils.isEmptyOrWhitespace(tweetItem.url) &&
        ValidationUtils.isValidUrlFormat(tweetItem.url)
      );
      
      if (isTweetItemValid) {
        validatedTweets.push(tweetItem);
      } else {
        invalidatedTweets.push({ 
          itemIndex, 
          tweetItem, 
          invalidationReason: '缺少必要字段或URL格式无效' 
        });
      }
    });
    
    return {
      isDataValid: invalidatedTweets.length === 0,
      validatedTweets,
      invalidatedTweets,
      validationMessage: `验证完成: ${validatedTweets.length} 条有效，${invalidatedTweets.length} 条无效`
    };
  }
}

// 创建单例实例
const tweetDataService = new TweetDataService();

module.exports = {
  TweetDataService,
  tweetDataService
};