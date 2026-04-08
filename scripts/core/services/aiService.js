/**
 * AI服务模块
 * 
 * 提供完整的AI服务集成功能，包括：
 * - CozeLoop API客户端管理
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

const { ApiClient, PromptAsAService } = require('@cozeloop/ai');
const { applicationConfig } = require('../reports/config');
const { Logger, ValidationUtils, ErrorHandler, DataFormatter } = require('../lib/utils');

/**
 * AI服务管理类
 * 
 * 提供完整的AI服务接口，支持：
 * - CozeLoop 客户端初始化和配置
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
   * @param {string} configuration.ai.cozeToken - CozeLoop Token
   * @param {string} configuration.ai.cozeBaseUrl - CozeLoop API基础URL
   * @param {string} configuration.ai.cozePromptKey - Prompt Key
   * @throws {Error} 当配置无效时抛出错误
   * @example
   * const service = new AIServiceManager({
   *   ai: {
   *     cozeToken: 'pat_xxx',
   *     cozeWorkspaceId: 'workspace_xxx',
   *     cozePromptKey: 'daily_report'
   *   }
   * });
   */
  constructor() {
    this.isConfigured = false;
    this.cozeClient = null;
    this.cozeModel = null;
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
   * 初始化 CozeLoop API 客户端
   * 
   * 创建并配置 CozeLoop 客户端实例，设置工作空间和 Prompt 信息
   * 
   * @private
   * @method initializeService
   * @throws {Error} 当API配置无效时抛出错误
   * @returns {void}
   */
  initializeService() {
    try {
      this.initializeCozeService();
    } catch (error) {
      Logger.error('AI服务初始化失败', { error: error.message });
      throw error;
    }
  }

  initializeCozeService() {
    const {
      cozeToken,
      cozeBaseUrl,
      cozeWorkspaceId,
      cozePromptKey,
      cozePromptVersion,
      requestTimeout
    } = applicationConfig.aiService;

    const normalizedToken = (cozeToken || '').trim();
    const normalizedWorkspaceId = (cozeWorkspaceId || '').trim();
    const normalizedPromptKey = (cozePromptKey || '').trim();
    const normalizedPromptVersion = (cozePromptVersion || '').trim();

    if (this.isPlaceholder(normalizedToken)) {
      throw ErrorHandler.createStandardizedError(
        'COZELOOP_TOKEN 未配置或仍为占位符，请设置真实的 CozeLoop Token',
        'MISSING_COZE_TOKEN'
      );
    }

    if (this.isPlaceholder(normalizedWorkspaceId)) {
      throw ErrorHandler.createStandardizedError(
        'COZELOOP_WORKSPACE_ID 未配置或仍为占位符，请设置真实的 CozeLoop 工作空间 ID',
        'MISSING_COZE_WORKSPACE_ID'
      );
    }

    if (this.isPlaceholder(normalizedPromptKey)) {
      throw ErrorHandler.createStandardizedError(
        'COZELOOP_PROMPT_KEY 未配置或仍为占位符，请设置真实的 Prompt Key',
        'MISSING_COZE_PROMPT_KEY'
      );
    }

    const apiClientOptions = {
      token: normalizedToken,
      baseURL: cozeBaseUrl,
      axiosOptions: {
        timeout: requestTimeout
      }
    };

    this.cozeClient = new ApiClient(apiClientOptions);
    this.cozeModel = new PromptAsAService({
      workspaceId: normalizedWorkspaceId,
      prompt: {
        prompt_key: normalizedPromptKey,
        ...(normalizedPromptVersion ? { version: normalizedPromptVersion } : {})
      },
      apiClient: this.cozeClient
    });

    this.isConfigured = true;
    Logger.info('CozeLoop AI服务初始化成功', {
      provider: 'cozeloop',
      workspaceId: normalizedWorkspaceId,
      promptKey: normalizedPromptKey,
      hasPromptVersion: !!normalizedPromptVersion
    });
  }

  /**
   * 确保服务已初始化
   * @private
   */
  ensureServiceInitialized() {
    if (!this.isConfigured || !this.cozeModel) {
      this.initializeService();
    }
  }

  /**
   * 调用 CozeLoop API 生成内容
   * 
   * 发送请求到 CozeLoop API，处理响应和错误，确保稳定的服务调用
   * 
   * @private
   * @async
   * @method generateContent
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
      
      Logger.info('开始调用 CozeLoop 生成内容...', {
        promptKey: applicationConfig.aiService.cozePromptKey
      });
      
      const requestPayload = this.buildRequestPayload(promptText, options);
      const apiResponse = await this.makeAPIRequest(requestPayload);
      const generatedContent = this.extractContentFromResponse(apiResponse);

      Logger.info('CozeLoop 调用成功，内容生成完成');

      return {
        content: generatedContent
      };
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

    return {
      messages,
      variables: options.variables || {}
    };
  }

  /**
   * 发送API请求到AI服务（带重试机制）
   * 
   * 处理与 CozeLoop 的通信，包括请求构建、发送和响应处理
   * 
   * @private
   * @async
   * @method makeAPIRequest
   * @param {Object} requestData - 请求数据对象
   * @param {Array} requestData.messages - 消息数组
   * @param {number} [retryCount=0] - 当前重试次数
   * @returns {Promise<Object>} API响应数据
   * @throws {Error} 当API请求失败时抛出错误
   * @example
   * // 内部使用，发送结构化的API请求
   * const response = await this.makeAPIRequest({
   *   messages: [{ role: 'user', content: 'Hello' }]
   * });
   */
  async makeAPIRequest(requestPayload, retryCount = 0) {
    try {
      if (!this.cozeModel) {
        throw new Error('CozeLoop 模型未初始化');
      }

      return await this.cozeModel.invoke(requestPayload);
    } catch (error) {
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

      Logger.error('CozeLoop API请求失败', errorDetails);

      if (error.response) {
        const { status, data } = error.response;

        if (status === 401) {
          throw ErrorHandler.createStandardizedError(
            'CozeLoop 认证失败 (状态码: 401)，请检查 COZELOOP_TOKEN 是否有效，以及工作空间权限是否正确',
            'API_AUTHENTICATION_ERROR',
            error
          );
        }
        
        throw ErrorHandler.createStandardizedError(
          `CozeLoop 请求失败 (状态码: ${status}): ${data?.message || data?.error?.message || '未知错误'}`,
          'API_REQUEST_ERROR',
          error
        );
      } else if (error.request) {
        let errorMessage = 'CozeLoop 网络连接失败';
        if (errorDetails.isProxyError) {
          errorMessage += `，代理服务器连接失败 (${process.env.PROXY_HOST}:${process.env.PROXY_PORT})`;
        } else if (errorDetails.isTimeoutError) {
          errorMessage += '，请求超时';
        } else {
          errorMessage += '，请检查网络连接和防火墙设置';
        }
        
        const maxRetries = 3;
        const retryDelay = Math.pow(2, retryCount) * 1000;
        
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
    const content = apiResponse?.message?.content;
    const parts = apiResponse?.message?.parts;

    if (typeof content === 'string' && content.trim()) {
      return content.trim();
    }

    if (Array.isArray(parts)) {
      const mergedText = parts
        .map(part => part?.text || '')
        .join('')
        .trim();

      if (mergedText) {
        return mergedText;
      }
    }

    throw ErrorHandler.createStandardizedError('CozeLoop 响应格式异常：缺少 message.content', 'INVALID_COZE_RESPONSE');
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

  buildTweetAnalysisPromptParts(tweetsData) {
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
    
    const systemPrompt = `请分析用户提供的推文数据，提取有价值的科技资讯信息，生成一份使用带圆圈数字编号格式的中文简报。

## 分析要求

1. **内容筛选**：只选择有价值的${categoriesText}相关内容

2. **主题分组**：根据推文内容和关键词进行主题分组，相同公司、产品或技术领域的消息归为一组

3. **单独成组**：如果某个主题只有一条消息，可以单独成组

4. **合并相关**：如果某个主题有多条相关消息，请合并为一个主题组

5. **重要性排序**：按重要性和影响力排序，最多选择${maxReportItems}条最有价值的信息

6. **优先级**：优先选择技术创新、产品发布、行业动态、重大更新等重要资讯


## 格式要求

### 编号格式

- **主要条目**：使用带圆圈的数字编号（① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ 等）
- **子项目**：如果某个主题有多个子项，使用 1）2）3）格式
- **段落分隔**：每个编号条目之间添加空行，确保排版清晰

### 内容组织

- **语言统一**：如果内容是英文或其他语言，请翻译成中文
- **价值筛选**：确保每条信息都有实际价值，避免重复或无意义的内容
- **详细描述**：每个条目包含详细描述和准确的消息来源，消息来源必须包含原始推文的链接
- **逻辑清晰**：内容层次分明，易于阅读和理解


## 格式示例

① **Anthropic / Claude Code 近期密集更新，同时因源码泄露引发对其架构、能力边界与治理流程的集中关注。**  
1）官方已将 **Auto mode** 扩展到 Enterprise 计划与 API 用户，可通过 `claude --enable-auto-mode` 启用，说明 Claude Code 正在从“辅助编程”继续向更高自动化的代理式编码体验推进。  
2）官方还上线了 **Computer use in Claude Code** 研究预览，支持直接从 CLI 打开应用、操作 UI、测试自己生成的结果，这是“代码代理”向“电脑操作代理”扩展的重要一步。  
3）终端侧新增实验性 **NO_FLICKER 渲染模式**，通过虚拟化 viewport 改善长对话下终端闪屏、跳屏问题，并支持鼠标交互、输入框固定到底部等体验优化。  
4）围绕 Claude Code 源码泄露，社区出现了对其记忆系统、Agent Loop、功能开关、提示词工程与遥测机制的大量拆解；Anthropic 工程负责人也公开说明问题源于手工部署流程，后续已改进自动化与流程控制。这起事件本身也凸显了 AI 编程产品在透明度、遥测、功能灰度和闭源治理上的行业争议。  
消息来源：[ClaudeAI（Auto mode 面向 Enterprise/API）](https://x.com/claudeai/status/2038693742094246032) [ClaudeAI（Claude Code 接入 Computer Use）](https://x.com/claudeai/status/2038663014098899416) [bcherny（NO_FLICKER 模式发布）](https://x.com/bcherny/status/2039421575422980329) [bcherny（虚拟 viewport 渲染原理）](https://x.com/bcherny/status/2039421581907374320) [trq212（重写 renderer、支持鼠标与底部输入框）](https://x.com/trq212/status/2039453692592873587) [dotey（泄露并非 bun，而是开发者失误）](https://x.com/dotey/status/2039173976275009799) [bcherny（事故复盘：问题在流程而非个人）](https://x.com/bcherny/status/2039210700657307889) [dotey（可视化解析 Claude Code 原理网站）](https://x.com/dotey/status/2039365135140077765) [Barret_China（基于泄露代码分析记忆模块）](https://x.com/Barret_China/status/2039376926931104153) [vista8（拆出 300+ 提示词片段）](https://x.com/vista8/status/2039157673107849715)

② **Anthropic 或在研发常驻型 Always-on Agent「Conway」，Claude 产品线可能从 CLI/桌面工具继续走向长期在线代理平台。**  
爆料称 Anthropic 正在开发名为 **Conway** 的常驻代理方案，可能具备独立 UI、浏览器操作、连接器、Claude Code 联动、Webhook 调用与扩展支持等能力。如果属实，这意味着 Claude 将从“会话式 AI + 编码助手”进一步演化为可持续运行、跨工具编排的长期代理系统。  
消息来源：[TestingCatalog（Conway 爆料）](https://x.com/testingcatalog/status/2039490365414048182) [TestingCatalog（非愚人节补充说明）](https://x.com/testingcatalog/status/2039490367750279349) [TestingCatalog（Claude Code 桌面新模式线索）](https://x.com/testingcatalog/status/2038762640575434813)

③ **Z AI 发布 GLM-5V-Turbo，把“视觉编码模型”正式推向产品化，且已快速接入多个实际应用。**  
1）Z AI 正式发布 **GLM-5V-Turbo**，定位为 Vision Coding Model，强调原生多模态编码能力，可理解图片、视频、设计稿、文档布局等输入，并兼顾纯文本编程能力。  
2）该模型已上线 **Z AI Chat 和 Coding plans**。  
3）第三方生态接入速度很快：**TRAE** 已将其作为自定义模型提供，**Tabbit Browser** 也已支持其进行截图分析与网页界面理解。  
这表明“看图写界面 / 基于视觉参考做前端与代理任务”正在从概念能力转向可直接调用的商用能力。  
消息来源：[Zai_org（GLM-5V-Turbo 发布）](https://x.com/Zai_org/status/2039371126984360085) [Zai_org（纯文本 coding 能力说明）](https://x.com/Zai_org/status/2039371144340357509) [Zai_org（多模态融合技术说明）](https://x.com/Zai_org/status/2039371149721694639) [TestingCatalog（GLM-5V-Turbo 上线 Z AI 计划）](https://x.com/testingcatalog/status/2039429157717676529) [Trae_ai（TRAE 接入 GLM-5V-Turbo）](https://x.com/Trae_ai/status/2039380056460730451) [TabbitBrowser（Tabbit 接入 GLM-5V-Turbo）](https://x.com/TabbitBrowser/status/2039359108747522345) [e01ai（围绕 GLM-5V-Turbo 的界面探索）](https://x.com/e01ai/status/2039371892487024787)


## 分组提示

- 相同公司的多个产品发布可以归为一组，使用子编号（1）2）3）格式）
- 相同技术领域的不同公司动态可以分别成组
- 关注推文中的关键词，如公司名、产品名、技术术语等
- 优先合并具有明显关联性的消息`;

    const userPrompt = `请基于以下推文数据生成简报。

## 推文数据

${formattedTweets}

---

**请严格按照上述 Markdown 格式要求生成简报，确保标题层级清晰、列表格式标准、链接格式统一。特别注意：消息来源必须使用推文数据中提供的实际链接地址，格式为 [来源名称](实际链接地址)。**`;

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
        model: applicationConfig.aiService.cozePromptKey
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
    const { cozeToken, cozeWorkspaceId, cozePromptKey } = applicationConfig.aiService;

    const validationResults = {
      hasCozeToken: !ValidationUtils.isEmptyOrWhitespace(cozeToken),
      hasWorkspaceId: !ValidationUtils.isEmptyOrWhitespace(cozeWorkspaceId),
      hasPromptKey: !ValidationUtils.isEmptyOrWhitespace(cozePromptKey)
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
