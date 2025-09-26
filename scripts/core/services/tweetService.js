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

const { connectionManager } = require('../data/connectionManager');
const { applicationConfig } = require('../reports/config');
const { Logger, TimeUtils, ValidationUtils, ErrorHandler } = require('../lib/utils');

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
    Logger.info('[推文服务] TweetDataService 初始化完成');
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
    return await connectionManager.executeWithRetry(async (client) => {
      Logger.info('开始获取当天推文数据...');
      
      const { startTime: todayStartTime, endTime: todayEndTime } = TimeUtils.getCurrentDayTimeRange();
      const { tableName: tweetTableName } = applicationConfig.database;
      
      const { data: tweetDataCollection, error: databaseQueryError } = await client
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
    }, 'fetch_today_tweets');
  }

  /**
   * 获取指定日期的推文数据
   * 
   * 查询指定日期当天的所有推文数据
   * 
   * @async
   * @method fetchTweetsBySpecificDate
   * @param {string} targetDate - 目标日期 (YYYY-MM-DD 格式)
   * @returns {Promise<Array<Object>>} 指定日期的推文数据数组
   * @throws {Error} 当日期参数无效或数据库查询失败时抛出错误
   * @example
   * const tweets = await tweetService.fetchTweetsBySpecificDate('2024-01-15');
   * console.log(`获取到 ${tweets.length} 条推文`);
   */
  async fetchTweetsBySpecificDate(targetDate) {
    return await connectionManager.executeWithRetry(async (client) => {
      if (ValidationUtils.isEmptyOrWhitespace(targetDate)) {
        throw ErrorHandler.createStandardizedError('目标日期不能为空', 'INVALID_TARGET_DATE');
      }
      
      // 验证日期格式
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(targetDate)) {
        throw ErrorHandler.createStandardizedError(
          `无效的日期格式: ${targetDate}，请使用 YYYY-MM-DD 格式`,
          'INVALID_DATE_FORMAT'
        );
      }
      
      Logger.info(`获取指定日期的推文数据: ${targetDate}`);
      
      // 构建日期范围：从当天 00:00:00 到 23:59:59
      const startTime = `${targetDate}T00:00:00.000Z`;
      const endTime = `${targetDate}T23:59:59.999Z`;
      
      const { tableName: tweetTableName } = applicationConfig.database;
      
      const { data: tweetDataCollection, error: databaseQueryError } = await client
        .from(tweetTableName)
        .select('*')
        .gte('created_at', startTime)
        .lte('created_at', endTime)
        .order('created_at', { ascending: false });
      
      if (databaseQueryError) {
        throw ErrorHandler.createStandardizedError(
          `数据库查询失败: ${databaseQueryError.message}`,
          'DATABASE_QUERY_ERROR',
          databaseQueryError
        );
      }
      
      const retrievedTweetCount = tweetDataCollection ? tweetDataCollection.length : 0;
      Logger.info(`成功获取到 ${targetDate} 的 ${retrievedTweetCount} 条推文数据`);
      
      return tweetDataCollection || [];
    }, 'fetch_tweets_by_specific_date');
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
    return await connectionManager.executeWithRetry(async (client) => {
      if (ValidationUtils.isEmptyOrWhitespace(dateRangeStart) || ValidationUtils.isEmptyOrWhitespace(dateRangeEnd)) {
      throw ErrorHandler.createStandardizedError('开始日期和结束日期不能为空', 'INVALID_DATE_RANGE');
      }
      
      Logger.info(`获取日期范围内的推文数据: ${dateRangeStart} 到 ${dateRangeEnd}`);
      
      const { tableName: tweetTableName } = applicationConfig.database;
      
      const { data: rangedTweetCollection, error: rangeQueryError } = await client
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
    }, 'fetch_tweets_by_date_range');
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