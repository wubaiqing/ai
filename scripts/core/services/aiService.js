/**
 * AI服务模块
 *
 * 提供完整的AI服务集成功能，包括：
 * - DeepSeek API客户端管理
 * - 智能提示词生成和优化
 * - 推文内容分析和总结
 * - 错误处理和重试机制
 * - 响应内容验证和格式化
 *
 * @fileoverview AI服务访问层，封装所有与AI模型交互的操作
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 * @requires ../utils.js
 */

const axios = require('axios');
const { applicationConfig } = require('../reports/config');
const { Logger, ValidationUtils, ErrorHandler, DataFormatter } = require('../lib/utils');

/**
 * AI服务管理类
 *
 * 提供完整的AI服务接口，支持：
 * - DeepSeek 客户端初始化和配置
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
   * @throws {Error} 当配置无效时抛出错误
   */
  constructor() {
    this.isConfigured = false;
    this.deepseekClient = null;
  }

  isPlaceholder(value) {
    return (
      ValidationUtils.isEmptyOrWhitespace(value) ||
      value.includes('xxx') ||
      value.includes('your_') ||
      value === 'ptaas_demo'
    );
  }

  /**
   * 初始化 AI 服务
   */
  initializeService() {
    try {
      this.initializeDeepSeekService();
    } catch (error) {
      Logger.error('AI服务初始化失败', { error: error.message });
      throw error;
    }
  }

  initializeDeepSeekService() {
    const {
      deepseekApiKey,
      deepseekBaseUrl,
      deepseekModel,
      requestTimeout
    } = applicationConfig.aiService;

    const normalizedApiKey = (deepseekApiKey || '').trim();

    if (this.isPlaceholder(normalizedApiKey)) {
      throw ErrorHandler.createStandardizedError(
        'DEEPSEEK_API_KEY 未配置或仍为占位符，请设置真实的 DeepSeek API Key',
        'MISSING_DEEPSEEK_API_KEY'
      );
    }

    this.deepseekClient = axios.create({
      baseURL: deepseekBaseUrl,
      timeout: requestTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${normalizedApiKey}`
      }
    });

    this.isConfigured = true;
    Logger.info('DeepSeek AI服务初始化成功', {
      provider: 'deepseek',
      model: deepseekModel,
      baseUrl: deepseekBaseUrl
    });
  }

  /**
   * 确保服务已初始化
   * @private
   */
  ensureServiceInitialized() {
    if (!this.isConfigured || !this.deepseekClient) {
      this.initializeService();
    }
  }

  /**
   * 生成内容
   */
  async generateContent(promptText, options = {}) {
    try {
      this.ensureServiceInitialized();

      if (ValidationUtils.isEmptyOrWhitespace(promptText)) {
        throw ErrorHandler.createStandardizedError('提示词不能为空', 'EMPTY_PROMPT');
      }

      Logger.info('开始调用 deepseek 生成内容...');

      const generatedContent = await this.generateContentWithDeepSeek(promptText, options);

      Logger.info('deepseek 调用成功，内容生成完成');

      return {
        content: generatedContent
      };
    } catch (error) {
      Logger.error('AI内容生成失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 使用 DeepSeek 生成内容
   */
  async generateContentWithDeepSeek(promptText, options = {}) {
    const messages = [];

    if (!ValidationUtils.isEmptyOrWhitespace(options.systemPrompt)) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }

    messages.push({
      role: 'user',
      content: promptText
    });

    const requestPayload = {
      model: applicationConfig.aiService.deepseekModel,
      messages,
      temperature: applicationConfig.aiService.temperature,
      max_tokens: applicationConfig.aiService.maxTokens
    };

    const response = await this.makeDeepSeekAPIRequest(requestPayload);
    return response.choices[0].message.content;
  }

  /**
   * DeepSeek API 请求（带重试机制）
   */
  async makeDeepSeekAPIRequest(requestPayload, retryCount = 0) {
    try {
      const response = await this.deepseekClient.post('/chat/completions', requestPayload);
      return response.data;
    } catch (error) {
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        isNetworkError: !error.response,
        isTimeoutError: error.code === 'ECONNABORTED'
      };

      Logger.error('DeepSeek API请求失败', errorDetails);

      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          throw ErrorHandler.createStandardizedError(
            'DeepSeek 认证失败 (状态码: 401)，请检查 DEEPSEEK_API_KEY 是否有效',
            'API_AUTHENTICATION_ERROR',
            error
          );
        }

        throw ErrorHandler.createStandardizedError(
          `DeepSeek 请求失败 (状态码: ${status}): ${data?.error?.message || data?.message || '未知错误'}`,
          'API_REQUEST_ERROR',
          error
        );
      } else if (error.request) {
        const maxRetries = 3;
        const retryDelay = Math.pow(2, retryCount) * 1000;

        if (retryCount < maxRetries && (errorDetails.isNetworkError || errorDetails.isTimeoutError)) {
          Logger.warn(`网络请求失败，${retryDelay}ms后进行第${retryCount + 1}次重试`, {
            retryCount: retryCount + 1,
            maxRetries,
            error: error.message
          });

          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.makeDeepSeekAPIRequest(requestPayload, retryCount + 1);
        }

        throw ErrorHandler.createStandardizedError(
          'DeepSeek 网络连接失败，请检查网络连接和防火墙设置',
          'NETWORK_ERROR',
          error
        );
      } else {
        throw ErrorHandler.createStandardizedError(
          `请求配置错误: ${error.message}`,
          'REQUEST_CONFIG_ERROR',
          error
        );
      }
    }
  }

  /**
   * 预处理推文数据，进行主题分组和相似性分析
   * @param {Array} tweetsData - 推文数据数组
   * @returns {Array} 预处理后的推文数据
   * @private
   */
  preprocessTweetsForGrouping(tweetsData) {
    return tweetsData.map((tweet, index) => {
      const sanitizedContent = DataFormatter.sanitizeTextForHtml(tweet.content);
      const truncatedContent = DataFormatter.truncateTextToLength(sanitizedContent, 500);

      const keywords = this.extractKeywords(sanitizedContent);

      return {
        ...tweet,
        index: index + 1,
        sanitizedContent,
        truncatedContent,
        keywords,
        formattedContent: `${index + 1}. 内容: ${truncatedContent}\n   链接: ${tweet.url}\n   发布时间: ${tweet.published_date}`
      };
    });
  }

  /**
   * 简单的关键词提取方法
   * @param {string} content - 推文内容
   * @returns {Array} 关键词数组
   * @private
   */
  extractKeywords(content) {
    const techKeywords = [
      'AI', '人工智能', 'GPT', 'ChatGPT', 'OpenAI', 'Claude', 'Anthropic',
      '通义千问', 'Qwen', '阿里', 'Alibaba', '百度', 'Baidu', '腾讯', 'Tencent',
      '字节跳动', 'ByteDance', '华为', 'Huawei', '小米', 'Xiaomi',
      'API', 'SDK', '开源', 'GitHub', '模型', 'Model', 'LLM', 'NLP',
      'TTS', '语音', '图像', 'Image', '视频', 'Video', '多模态',
      'iOS', 'Android', 'Web', 'App', '应用', '发布', 'Release',
      '更新', 'Update', '版本', 'Version', '功能', 'Feature'
    ];

    const foundKeywords = [];
    const lowerContent = content.toLowerCase();

    techKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    });

    return foundKeywords;
  }

  buildTweetAnalysisPromptParts(tweetsData) {
    if (ValidationUtils.isEmptyOrInvalidArray(tweetsData)) {
      throw ErrorHandler.createStandardizedError('推文数据不能为空', 'EMPTY_TWEETS_DATA');
    }

    const { maxReportItems, contentCategories } = applicationConfig.business;

    const processedTweets = this.preprocessTweetsForGrouping(tweetsData);

    const formattedTweets = processedTweets.map(tweet => {
      const keywordsText = tweet.keywords.length > 0 ? `\n   关键词: ${tweet.keywords.join(', ')}` : '';
      return `${tweet.formattedContent}${keywordsText}`;
    }).join('\n\n');

    const categoriesText = contentCategories.join('、');

    const systemPrompt = `你是一名 AI 行业资讯编辑，请基于用户提供的推文数据生成中文简报。

## 核心目标

1. 只保留有信息密度和传播价值的${categoriesText}相关内容
2. 按事件重要性排序，最多保留${maxReportItems}个重点主题
3. 对同一公司/产品/技术线的相关动态进行合并，减少重复
4. 输出风格优先"资讯感"，避免公文腔和模板化表达

## 写作要求

- 可以灵活组织段落与小标题，不强制固定编号样式
- 如果原文是英文或其他语言，转写成自然中文
- 每个主题先给出一句结论，再补充关键信息与影响
- 允许保留适度观点，但不要编造事实或来源
- 对不确定信息使用"据披露/据推测"等审慎措辞

## 事实与来源

- 消息来源必须使用用户提供的原始推文链接
- 链接格式保持为 [来源名称](实际链接地址)
- 同一主题可附多个来源，但只保留最关键的链接
- 严禁输出用户数据之外的虚构来源`;

    const userPrompt = `请基于以下推文数据生成一份"AI 资讯风格"的中文简报。

## 推文数据

${formattedTweets}

---

请优先保证信息价值和可读性，不要写成过度规范化模板。可使用 Markdown，但以自然阅读体验为准。
特别注意：消息来源必须使用推文数据中提供的实际链接地址，格式为 [来源名称](实际链接地址)。`;

    return {
      systemPrompt,
      userPrompt
    };
  }

  buildTweetAnalysisPrompt(tweetsData) {
    const { systemPrompt, userPrompt } = this.buildTweetAnalysisPromptParts(tweetsData);
    return `${systemPrompt}\n\n${userPrompt}`;
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

      const { systemPrompt, userPrompt } = this.buildTweetAnalysisPromptParts(tweetsData);
      const result = await this.generateContent(userPrompt, {
        ...options,
        systemPrompt
      });

      Logger.info('推文分析和简报生成完成');

      return {
        content: result.content,
        model: applicationConfig.aiService.deepseekModel
      };
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
    const { deepseekApiKey } = applicationConfig.aiService;

    const validationResults = {
      hasDeepSeekApiKey: !ValidationUtils.isEmptyOrWhitespace(deepseekApiKey)
    };

    const isValid = validationResults.hasDeepSeekApiKey;

    return {
      isValid,
      details: validationResults,
      message: isValid ? 'DeepSeek AI服务配置有效' : 'DeepSeek AI服务配置不完整'
    };
  }
}

// 创建单例实例
const aiContentService = new AIContentService();

module.exports = {
  AIContentService,
  aiContentService
};
