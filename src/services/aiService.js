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
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { applicationConfig } = require('../reports/reportConfig');
const { Logger, ValidationUtils, ErrorHandler, DataFormatter } = require('../lib/utils');

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
      
      // 详细的API密钥验证
      if (ValidationUtils.isEmptyOrWhitespace(apiKey)) {
        throw ErrorHandler.createStandardizedError(
          'SILICONFLOW_API_KEY环境变量未配置\n\n🔧 解决方案：\n' +
          '1. 访问 https://siliconflow.cn/ 注册账号并获取API密钥\n' +
          '2. 在 .env 文件中设置 SILICONFLOW_API_KEY=你的真实API密钥\n' +
          '3. 重启应用程序使环境变量生效',
          'MISSING_API_KEY'
        );
      }
      
      // 检查是否为占位符
      if (apiKey === 'your_siliconflow_api_key_here') {
        throw ErrorHandler.createStandardizedError(
          'SILICONFLOW_API_KEY仍为占位符，请设置真实的API密钥\n\n🔧 解决方案：\n' +
          '1. 访问 https://siliconflow.cn/ 获取真实API密钥\n' +
          '2. 替换 .env 文件中的占位符文本\n' +
          '3. 重启应用程序',
          'PLACEHOLDER_API_KEY'
        );
      }
      
      if (ValidationUtils.isEmptyOrWhitespace(baseUrl)) {
        throw ErrorHandler.createStandardizedError(
          'AI服务基础URL未配置',
          'MISSING_BASE_URL'
        );
      }

      // 配置代理（如果存在）
      const axiosConfig = {
        baseURL: baseUrl,
        timeout: requestTimeout,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      // 添加代理支持
      if (process.env.PROXY_HOST && process.env.PROXY_PORT) {
        const proxyUrl = `http://${process.env.PROXY_HOST}:${process.env.PROXY_PORT}`;
        const isHttps = baseUrl.startsWith('https');
        axiosConfig.httpsAgent = isHttps ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
        axiosConfig.httpAgent = new HttpProxyAgent(proxyUrl);
        
        Logger.info('AI服务已配置代理', { 
          proxyUrl: proxyUrl,
          isHttps: isHttps 
        });
      }

      // 配置HTTP客户端
      this.httpClient = axios.create(axiosConfig);
      
      this.isConfigured = true;
      Logger.info('AI服务初始化成功', { 
        baseUrl: baseUrl,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length 
      });
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
   * 发送API请求到AI服务（带重试机制）
   * 
   * 处理与AI服务的HTTP通信，包括请求构建、发送和响应处理
   * 
   * @private
   * @async
   * @method makeAPIRequest
   * @param {Object} requestData - 请求数据对象
   * @param {string} requestData.model - 使用的AI模型名称
   * @param {Array} requestData.messages - 消息数组
   * @param {number} [requestData.max_tokens] - 最大token数量
   * @param {number} [requestData.temperature] - 温度参数
   * @param {number} [retryCount=0] - 当前重试次数
   * @returns {Promise<Object>} API响应数据
   * @throws {Error} 当API请求失败时抛出错误
   * @example
   * // 内部使用，发送结构化的API请求
   * const response = await this.makeAPIRequest({
   *   model: 'gpt-3.5-turbo',
   *   messages: [{ role: 'user', content: 'Hello' }]
   * });
   */
  async makeAPIRequest(requestPayload, retryCount = 0) {
    try {
      const response = await this.httpClient.post('', requestPayload);
      return response.data;
    } catch (error) {
      // 详细的错误诊断信息
      const errorDetails = {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          timeout: error.config?.timeout,
          proxy: error.config?.proxy || 'none'
        },
        isNetworkError: !error.response,
        isTimeoutError: error.code === 'ECONNABORTED',
        isProxyError: error.code === 'ECONNREFUSED' && process.env.PROXY_HOST
      };

      Logger.error('AI API请求失败', errorDetails);

      if (error.response) {
        // API返回了错误响应
        const { status, data } = error.response;
        
        // 特殊处理401认证错误
        if (status === 401) {
          const apiKeyStatus = process.env.SILICONFLOW_API_KEY;
          let errorMessage = 'API认证失败 (状态码: 401)';
          
          if (!apiKeyStatus || apiKeyStatus === 'your_siliconflow_api_key_here') {
            errorMessage += '\n\n🔧 解决方案：\n' +
              '1. 访问 https://siliconflow.cn/ 注册账号并获取API密钥\n' +
              '2. 在 .env 文件中设置 SILICONFLOW_API_KEY=你的真实API密钥\n' +
              '3. 确保API密钥不是占位符文本\n' +
              '4. 重启应用程序使环境变量生效';
          } else {
            errorMessage += '\n\n🔧 可能的原因：\n' +
              '1. API密钥已过期或无效\n' +
              '2. API密钥权限不足\n' +
              '3. 请检查硅基流动平台账户状态';
          }
          
          throw ErrorHandler.createStandardizedError(
            errorMessage,
            'API_AUTHENTICATION_ERROR',
            error
          );
        }
        
        throw ErrorHandler.createStandardizedError(
          `API请求失败 (状态码: ${status}): ${data.error?.message || '未知错误'}`,
          'API_REQUEST_ERROR',
          error
        );
      } else if (error.request) {
        // 处理网络连接错误
        let errorMessage = '网络连接失败';
        if (errorDetails.isProxyError) {
          errorMessage += `，代理服务器连接失败 (${process.env.PROXY_HOST}:${process.env.PROXY_PORT})`;
        } else if (errorDetails.isTimeoutError) {
          errorMessage += '，请求超时';
        } else {
          errorMessage += '，请检查网络连接和防火墙设置';
        }
        
        // 对于网络错误，尝试重试
        const maxRetries = 3;
        const retryDelay = Math.pow(2, retryCount) * 1000; // 指数退避：1s, 2s, 4s
        
        if (retryCount < maxRetries && (errorDetails.isNetworkError || errorDetails.isTimeoutError)) {
          Logger.warn(`网络请求失败，${retryDelay}ms后进行第${retryCount + 1}次重试`, {
            retryCount: retryCount + 1,
            maxRetries,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.makeAPIRequest(requestPayload, retryCount + 1);
        }
        
        throw ErrorHandler.createStandardizedError(
          errorMessage,
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
  /**
   * 预处理推文数据，进行主题分组和相似性分析
   * @param {Array} tweetsData - 推文数据数组
   * @returns {Array} 预处理后的推文数据
   * @private
   */
  preprocessTweetsForGrouping(tweetsData) {
    // 添加主题关键词提取和相似度分析
    return tweetsData.map((tweet, index) => {
      const sanitizedContent = DataFormatter.sanitizeTextForHtml(tweet.content);
      const truncatedContent = DataFormatter.truncateTextToLength(sanitizedContent, 500);
      
      // 提取关键词用于主题分组（简单的关键词提取）
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
    // 简单的关键词提取：公司名、产品名、技术术语等
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

  buildTweetAnalysisPrompt(tweetsData) {
    if (ValidationUtils.isEmptyOrInvalidArray(tweetsData)) {
      throw ErrorHandler.createStandardizedError('推文数据不能为空', 'EMPTY_TWEETS_DATA');
    }
    
    const { maxReportItems, contentCategories } = applicationConfig.business;
    
    // 预处理推文数据
    const processedTweets = this.preprocessTweetsForGrouping(tweetsData);
    
    // 格式化推文内容，包含关键词信息
    const formattedTweets = processedTweets.map(tweet => {
      const keywordsText = tweet.keywords.length > 0 ? `\n   关键词: ${tweet.keywords.join(', ')}` : '';
      return `${tweet.formattedContent}${keywordsText}`;
    }).join('\n\n');
    
    const categoriesText = contentCategories.join('、');
    
    return `请分析以下推文数据，提取有价值的科技资讯信息，生成一份中文简报。

分析要求：
1. 只选择有价值的${categoriesText}相关内容
2. 根据推文内容和关键词进行主题分组，相同公司、产品或技术领域的消息归为一组
3. 如果某个主题只有一条消息，可以单独成组
4. 如果某个主题有多条相关消息，请合并为一个主题组
5. 按重要性和影响力排序，最多选择${maxReportItems}条最有价值的信息
6. 优先选择技术创新、产品发布、行业动态、重大更新等重要资讯

格式要求：
1. 对于单个主题，使用带圆圈数字的主标题格式：① ② ③ ...
2. 主标题应概括该主题的核心内容（如：公司名+主要动作）
3. 对于同一主题下的多个消息源，使用数字编号的子项目格式：1）2）3）...
4. 每个子项目包含详细描述和消息来源链接
5. 消息来源格式为：消息来源（直接使用推文URL）
6. 如果内容是英文或其他语言，请翻译成中文
7. 确保每条信息都有实际价值，避免重复或无意义的内容

格式示例：
① 通义千问（Qwen）密集发布多款新模型
1）发布了首个原生端到端全模态 AI 模型 Qwen3-Omni，能在一个模型中统一处理文本、图像、音频和视频，官方称在多项音视频基准测试中达到 SOTA 水平。已开源 Qwen3-Omni-30B-A3B 系列模型。消息来源
2）Qwen-Image-Edit-2509：全新的图像编辑模型，支持多图像编辑、保持人脸和产品一致性、编辑文字内容及样式，并内置 ControlNet 支持。消息来源
3）Qwen3-TTS-Flash：发布新的文本转语音（TTS）模型，支持 17 种音色、10 种语言及 9 种以上中文方言，首包响应时间仅 97 毫秒。消息来源

② OpenAI 发布新功能更新
1）具体功能描述。消息来源

分组提示：
- 相同公司的多个产品发布可以归为一组
- 相同技术领域的不同公司动态可以分别成组
- 关注推文中的关键词，如公司名、产品名、技术术语等
- 优先合并具有明显关联性的消息

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