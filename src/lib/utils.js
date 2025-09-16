/**
 * 工具函数模块
 * 
 * 提供应用程序所需的通用工具类和辅助函数，包括：
 * - 时间处理和日期格式化工具
 * - 数据验证和类型检查工具
 * - 错误处理和异常管理工具
 * - 数据格式化和文本处理工具
 * - 通用业务逻辑辅助函数
 * 
 * @fileoverview 通用工具库，为所有模块提供基础功能支持
 * @author AI Assistant
 * @version 1.0.0
 * @since 2024-01-01
 * @namespace Utils
 */

const { applicationConfig } = require('../reports/reportConfig');

/**
 * 应用程序日志记录工具类
 * @class Logger
 */
class Logger {
  /**
   * 通用日志记录方法
   * @param {string} logLevel - 日志级别
   * @param {string} message - 日志消息
   * @param {Object} [metadata={}] - 附加元数据
   */
  static log(logLevel, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${logLevel}] ${message}`;
    
    // 根据日志级别选择输出方式
    switch (logLevel) {
      case applicationConfig.logging.levels.ERROR:
        console.error(logEntry, metadata);
        break;
      case applicationConfig.logging.levels.WARN:
        console.warn(logEntry, metadata);
        break;
      case applicationConfig.logging.levels.INFO:
      default:
        console.log(logEntry, metadata);
        break;
    }
  }

  /**
   * 记录信息级别日志
   * @param {string} message - 信息消息
   * @param {Object} [metadata] - 上下文数据
   */
  static info(message, metadata) {
    this.log(applicationConfig.logging.levels.INFO, message, metadata);
  }

  /**
   * 记录警告级别日志
   * @param {string} message - 警告消息
   * @param {Object} [metadata] - 上下文信息
   */
  static warn(message, metadata) {
    this.log(applicationConfig.logging.levels.WARN, message, metadata);
  }

  /**
   * 记录错误级别日志
   * @param {string} message - 错误消息
   * @param {Object} [metadata] - 错误详细信息
   */
  static error(message, metadata) {
    this.log(applicationConfig.logging.levels.ERROR, message, metadata);
  }
}

/**
 * 时间处理和日期格式化工具类
 * @class TimeUtils
 */
class TimeUtils {
  /**
   * 获取当前日期的完整时间范围
   * @returns {Object} 包含startTime和endTime的对象
   */
  static getCurrentDayTimeRange() {
    const todayTimestamp = new Date();
    const dayStartTimestamp = new Date(
      todayTimestamp.getFullYear(),
      todayTimestamp.getMonth(),
      todayTimestamp.getDate()
    );
    const dayEndTimestamp = new Date(
      todayTimestamp.getFullYear(),
      todayTimestamp.getMonth(),
      todayTimestamp.getDate() + 1
    );
    
    return {
      startTime: dayStartTimestamp.toISOString(),
      endTime: dayEndTimestamp.toISOString()
    };
  }

  /**
   * 将日期格式化为本地化字符串
   * @param {Date} [targetDate=new Date()] - 目标日期
   * @param {string} [localeSettings] - 本地化设置
   * @returns {string} 格式化后的日期字符串
   */
  static formatDateToLocalizedString(targetDate = new Date(), localeSettings = applicationConfig.business.reportLanguage) {
    return targetDate.toLocaleDateString(localeSettings);
  }

  /**
   * 将日期时间格式化为本地化字符串
   * @param {Date} [targetDateTime=new Date()] - 日期时间
   * @param {string} [localeSettings] - 本地化设置
   * @returns {string} 格式化后的日期时间字符串
   */
  static formatDateTimeToLocalizedString(targetDateTime = new Date(), localeSettings = applicationConfig.business.reportLanguage) {
    return targetDateTime.toLocaleString(localeSettings);
  }


}

/**
 * 数据验证和输入校验工具类
 * @class ValidationUtils
 */
class ValidationUtils {
  /**
   * 检查字符串是否为空或仅包含空白字符
   * @param {string} inputString - 输入字符串
   * @returns {boolean} 是否为空或空白
   */
  static isEmptyOrWhitespace(inputString) {
    return !inputString || typeof inputString !== 'string' || inputString.trim().length === 0;
  }

  /**
   * 检查字符串是否有效
   * @param {string} inputString - 输入字符串
   * @returns {boolean} 是否为有效字符串
   */
  static isValidNonEmptyString(inputString) {
    return !this.isEmptyOrWhitespace(inputString);
  }

  /**
   * 检查数组是否为空或无效
   * @param {Array} inputArray - 输入数组
   * @returns {boolean} 是否为空数组
   */
  static isEmptyOrInvalidArray(inputArray) {
    return !Array.isArray(inputArray) || inputArray.length === 0;
  }

  /**
   * 验证URL格式是否正确
   * @param {string} urlString - URL字符串
   * @returns {boolean} 是否为有效URL
   */
  static isValidUrlFormat(urlString) {
    try {
      new URL(urlString);
      return true;
    } catch (urlValidationError) {
      return false;
    }
  }
}

/**
 * 错误处理和异常管理工具类
 * @class ErrorHandler
 */
class ErrorHandler {
  /**
   * 创建标准化的错误对象
   * @param {string} errorMessage - 错误描述信息
   * @param {string} [errorCode] - 错误代码标识
   * @param {Error} [sourceError] - 原始错误对象
   * @returns {Error} 标准化错误对象
   */
  static createStandardizedError(errorMessage, errorCode = null, sourceError = null) {
    const standardError = new Error(errorMessage);
    if (errorCode) standardError.code = errorCode;
    if (sourceError) standardError.originalError = sourceError;
    return standardError;
  }

  /**
   * 安全执行异步函数
   * @param {Function} asyncFunction - 异步函数
   * @param {*} [defaultValue=null] - 默认值
   * @param {Object} [context={}] - 执行上下文
   * @returns {Promise<*>} 执行结果或默认值
   */
  static executeWithErrorHandling(targetFunction, fallbackValue = null) {
    try {
      return targetFunction();
    } catch (executionError) {
      console.error('SafeExecute error:', executionError);
      return fallbackValue;
    }
  }

  /**
   * 记录错误信息到日志系统
   * @param {Error|string} error - 错误对象或消息
   * @param {Object} [context={}] - 上下文信息
   */
  static logErrorWithContext(errorObject, contextInfo = '') {
    const errorTimestamp = new Date().toISOString();
    const formattedLogMessage = `[${errorTimestamp}] ${contextInfo ? `[${contextInfo}] ` : ''}${errorObject.message}`;
    console.error(formattedLogMessage);
    if (errorObject.stack) {
      console.error(errorObject.stack);
    }
  }
}

/**
 * 数据格式化和文本处理工具类
 * @class DataFormatter
 */
class DataFormatter {
  /**
   * 截断文本到指定长度
   * @param {string} inputText - 输入文本
   * @param {number} maximumLength - 最大长度
   * @param {string} [truncationSuffix='...'] - 省略号
   * @returns {string} 截断后的文本
   */
  static truncateTextToLength(inputText, maximumLength, truncationSuffix = '...') {
    if (!inputText || typeof inputText !== 'string') return '';
    if (inputText.length <= maximumLength) return inputText;
    return inputText.substring(0, maximumLength - truncationSuffix.length) + truncationSuffix;
  }

  /**
   * 清理HTML标签，保留纯文本
   * @param {string} inputText - HTML内容
   * @returns {string} 纯文本内容
   */
  static sanitizeTextForHtml(inputText) {
    if (!inputText || typeof inputText !== 'string') return '';
    return inputText.replace(/[<>"'&]/g, (matchedCharacter) => {
      const htmlEntityMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;'
      };
      return htmlEntityMap[matchedCharacter];
    });
  }


}

module.exports = {
  Logger,
  TimeUtils,
  ValidationUtils,
  ErrorHandler,
  DataFormatter
};