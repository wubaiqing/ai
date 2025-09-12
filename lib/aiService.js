/**
 * AI服务模块
 * 
 * 提供完整的AI服务集成功能，包括：
 * - OpenAI API客户端管理
 * - 智能提示词生成和优化
 * - 推文内容分析和总结
 * - 错误处理和重试机制
 * - 响应内容验证和格式化
 * 
 * @fileoverview AI服务访问层，封装所有与AI模型交互的操作
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 * @requires openai
 * @requires ../utils.js
 */

const axios = require('axios');
const { applicationConfig } = require('./reportConfig');
const { Logger, ValidationUtils, ErrorHandler, DataFormatter } = require('./utils');

/**
 * AI服务管理类
 * 
 * 提供完整的AI服务接口，支持：
 * - OpenAI客户端初始化和配置
 * - 智能提示词构建和优化
 * - 推文数据分析和总结生成
 * - API调用错误处理和重试
 * - 响应内容质量验证
 * 
 * @class AIServiceManager
 * @example
 * const aiService = new AIServiceManager(config);
 * const report = await aiService.generateTweetSummary(tweets);
 * console.log('生成的报告:', report);
 */
class AIContentService {
  /**
   * 构造AI服务管理实例
   * 
   * @constructor
   * @param {Object} configuration - AI服务配置对象
   * @param {Object} configuration.ai - AI服务配置
   * @param {string} configuration.ai.apiKey - OpenAI API密钥
   * @param {string} configuration.ai.baseUrl - API基础URL
   * @param {string} configuration.ai.modelName - 使用的AI模型名称
   * @param {number} configuration.ai.maxTokens - 最大令牌数限制
   * @param {number} configuration.ai.temperature - 生成温度参数(0-1)
   * @throws {Error} 当配置无效时抛出错误
   * @example
   * const service = new AIServiceManager({
   *   ai: {
   *     apiKey: 'sk-xxx',
   *     modelName: 'gpt-4',
   *     maxTokens: 2000,
   *     temperature: 0.7
   *   }
   * });
   */
  constructor() {
    this.isConfigured = false;
    this.httpClient = null;
  }

  /**
   * 初始化OpenAI API客户端
   * 
   * 创建并配置OpenAI客户端实例，设置API密钥和请求参数
   * 
   * @private
   * @method initializeOpenAIClient
   * @throws {Error} 当API配置无效时抛出错误
   * @returns {void}
   */
  initializeService() {
    try {
      const { apiKey, baseUrl, requestTimeout } = applicationConfig.aiService;
      
      if (ValidationUtils.isEmptyOrWhitespace(apiKey)) {
      throw ErrorHandler.createStandardizedError(
          'SILICONFLOW_API_KEY环境变量未配置',
          'MISSING_API_KEY'
        );
      }
      
      if (ValidationUtils.isEmptyOrWhitespace(baseUrl)) {
      throw ErrorHandler.createStandardizedError(
          'AI服务基础URL未配置',
          'MISSING_BASE_URL'
        );
      }

      // 配置HTTP客户端
      this.httpClient = axios.create({
        baseURL: baseUrl,
        timeout: requestTimeout,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      this.isConfigured = true;
      Logger.info('AI服务初始化成功');
    } catch (error) {
      Logger.error('AI服务初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 确保服务已初始化
   * @private
   */
  ensureServiceInitialized() {
    if (!this.isConfigured || !this.httpClient) {
      this.initializeService();
    }
  }

  /**
   * 调用OpenAI API生成内容
   * 
   * 发送请求到OpenAI API，处理响应和错误，确保稳定的服务调用
   * 
   * @private
   * @async
   * @method callOpenAIAPI
   * @param {string} promptText - 完整的提示词内容
   * @returns {Promise<string>} AI生成的响应内容
   * @throws {Error} 当API调用失败或响应无效时抛出错误
   * @example
   * // 内部使用，发送提示词并获取AI响应
   * const response = await this.callOpenAIAPI(prompt);
   */
  async generateContent(promptText, options = {}) {
    try {
      this.ensureServiceInitialized();
      
      if (ValidationUtils.isEmptyOrWhitespace(promptText)) {
      throw ErrorHandler.createStandardizedError('提示词不能为空', 'EMPTY_PROMPT');
      }
      
      Logger.info('开始调用DeepSeek API生成内容...');
      
      const requestPayload = this.buildRequestPayload(promptText, options);
      const apiResponse = await this.makeAPIRequest(requestPayload);
      const generatedContent = this.extractContentFromResponse(apiResponse);
      
      Logger.info('DeepSeek API调用成功，内容生成完成');
      
      return generatedContent;
    } catch (error) {
      Logger.error('AI内容生成失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 构建API请求载荷
   * @param {string} promptText - 提示词
   * @param {Object} options - 可选参数
   * @returns {Object} 请求载荷
   * @private
   */
  buildRequestPayload(promptText, options) {
    const {
      modelName,
      maxTokens,
      temperature
    } = applicationConfig.aiService;
    
    return {
      model: options.model || modelName,
      messages: [
        {
          role: 'user',
          content: promptText
        }
      ],
      temperature: options.temperature || temperature,
      max_tokens: options.maxTokens || maxTokens,
      ...options.additionalParams
    };
  }

  /**
   * 执行API请求
   * @param {Object} requestPayload - 请求载荷
   * @returns {Promise<Object>} API响应
   * @private
   */
  async makeAPIRequest(requestPayload) {
    try {
      const response = await this.httpClient.post('', requestPayload);
      return response.data;
    } catch (error) {
      if (error.response) {
        // API返回了错误响应
        const { status, data } = error.response;
        throw ErrorHandler.createStandardizedError(
          `API请求失败 (状态码: ${status}): ${data.error?.message || '未知错误'}`,
          'API_REQUEST_ERROR',
          error
        );
      } else if (error.request) {
        // 请求发送失败
        throw ErrorHandler.createStandardizedError(
          '网络请求失败，请检查网络连接',
          'NETWORK_ERROR',
          error
        );
      } else {
        // 其他错误
        throw ErrorHandler.createStandardizedError(
          `请求配置错误: ${error.message}`,
          'REQUEST_CONFIG_ERROR',
          error
        );
      }
    }
  }

  /**
   * 验证AI响应内容的质量和完整性
   * 
   * 检查AI生成内容的长度、格式和质量，确保符合业务要求
   * 
   * @private
   * @method validateAIResponseQuality
   * @param {string} responseContent - AI生成的响应内容
   * @returns {boolean} 验证通过返回true，否则返回false
   * @example
   * // 内部使用，验证响应内容是否符合质量标准
   * const isValid = this.validateAIResponseQuality(aiResponse);
   */
  extractContentFromResponse(apiResponse) {
    if (!apiResponse || !apiResponse.choices || !Array.isArray(apiResponse.choices)) {
      throw ErrorHandler.createStandardizedError('API响应格式异常：缺少choices字段', 'INVALID_RESPONSE_FORMAT');
    }
    
    if (apiResponse.choices.length === 0) {
      throw ErrorHandler.createStandardizedError('API响应格式异常：choices数组为空', 'EMPTY_CHOICES');
    }
    
    const firstChoice = apiResponse.choices[0];
    if (!firstChoice.message || !firstChoice.message.content) {
      throw ErrorHandler.createStandardizedError('API响应格式异常：缺少message.content字段', 'MISSING_CONTENT');
    }
    
    return firstChoice.message.content.trim();
  }

  /**
   * 构建优化的AI提示词
   * 
   * 根据推文数据构建结构化的提示词，优化AI理解和生成效果
   * 
   * @private
   * @method buildOptimizedPrompt
   * @param {Array<Object>} tweetDataArray - 推文数据数组
   * @returns {string} 构建完成的提示词字符串
   * @example
   * // 内部使用，生成包含上下文和指令的完整提示词
   * const prompt = this.buildOptimizedPrompt(tweets);
   */
  buildTweetAnalysisPrompt(tweetsData) {
    if (ValidationUtils.isEmptyOrInvalidArray(tweetsData)) {
      throw ErrorHandler.createStandardizedError('推文数据不能为空', 'EMPTY_TWEETS_DATA');
    }
    
    const { maxReportItems, contentCategories } = applicationConfig.business;
    
    // 格式化推文内容
    const formattedTweets = tweetsData.map((tweet, index) => {
      const sanitizedContent = DataFormatter.sanitizeTextForHtml(tweet.content);
      const truncatedContent = DataFormatter.truncateTextToLength(sanitizedContent, 500);
      
      return `${index + 1}. 内容: ${truncatedContent}\n   链接: ${tweet.url}\n   发布时间: ${tweet.published_date}`;
    }).join('\n\n');
    
    const categoriesText = contentCategories.join('、');
    
    return `请分析以下推文数据，提取有价值的科技资讯信息，生成一份中文简报。

要求：
1. 只选择有价值的${categoriesText}相关内容
2. 每条信息用①②③...格式编号
3. 每条信息包含简要描述和消息来源链接
4. 消息来源就是推文的URL链接
5. 如果内容是英文或其他语言，请翻译成中文
6. 按重要性排序，最多选择${maxReportItems}条最有价值的信息
7. 格式参考：① 具体描述内容。消息来源
8. 确保每条信息都有实际价值，避免重复或无意义的内容
9. 优先选择技术创新、产品发布、行业动态等重要资讯

推文数据：
${formattedTweets}

请生成简报：`;
  }

  /**
   * 生成推文数据的智能简报
   * 
   * 分析推文内容，提取关键信息，生成结构化的简报摘要
   * 
   * @async
   * @method generateTweetSummary
   * @param {Array<Object>} tweetDataArray - 推文数据数组
   * @param {Object} tweetDataArray[].content - 推文内容
   * @param {string} tweetDataArray[].author - 推文作者
   * @param {string} tweetDataArray[].created_at - 创建时间
   * @returns {Promise<string>} 生成的简报内容
   * @throws {Error} 当AI服务调用失败时抛出错误
   * @example
   * const tweets = [{ content: '今天天气不错', author: '用户A', created_at: '2024-01-01' }];
   * const summary = await aiService.generateTweetSummary(tweets);
   */
  async analyzeTweetsAndGenerateReport(tweetsData, options = {}) {
    try {
      Logger.info(`开始分析 ${tweetsData.length} 条推文数据...`);
      
      const analysisPrompt = this.buildTweetAnalysisPrompt(tweetsData);
      const reportContent = await this.generateContent(analysisPrompt, options);
      
      Logger.info('推文分析和简报生成完成');
      
      return reportContent;
    } catch (error) {
      Logger.error('推文分析失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 验证API配置
   * @returns {Object} 验证结果
   */
  validateConfiguration() {
    const { apiKey, baseUrl, modelName } = applicationConfig.aiService;
    
    const validationResults = {
      hasApiKey: !ValidationUtils.isEmptyOrWhitespace(apiKey),
      hasBaseUrl: !ValidationUtils.isEmptyOrWhitespace(baseUrl),
      hasModelName: !ValidationUtils.isEmptyOrWhitespace(modelName)
    };
    
    const isValid = Object.values(validationResults).every(result => result === true);
    
    return {
      isValid,
      details: validationResults,
      message: isValid ? 'AI服务配置有效' : 'AI服务配置不完整'
    };
  }
}

// 创建单例实例
const aiContentService = new AIContentService();

module.exports = {
  AIContentService,
  aiContentService
};