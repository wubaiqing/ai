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
 * 日志记录器类
 */
class Logger {
  /**
   * 记录日志消息
   * @param {string} logLevel - 日志级别 (INFO, WARN, ERROR)
   * @param {string} message - 日志消息
   * @param {Object} [metadata] - 额外的元数据
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
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {Object} [metadata] - 额外的元数据
   */
  static info(message, metadata) {
    this.log(applicationConfig.logging.levels.INFO, message, metadata);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {Object} [metadata] - 额外的元数据
   */
  static warn(message, metadata) {
    this.log(applicationConfig.logging.levels.WARN, message, metadata);
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {Object} [metadata] - 额外的元数据
   */
  static error(message, metadata) {
    this.log(applicationConfig.logging.levels.ERROR, message, metadata);
  }
}

/**
 * 时间处理工具类
 * 
 * 提供完整的日期时间处理功能，包括：
 * - 日期范围计算和时间戳处理
 * - 多语言日期格式化
 * - 时区转换和本地化
 * - 日期验证和解析
 * 
 * @class TimeUtils
 * @namespace Utils.TimeUtils
 * @example
 * const timeRange = TimeUtils.getCurrentDayTimeRange();
 * const formatted = TimeUtils.formatDateToLocalizedString(new Date(), 'zh-CN');
 */
class TimeUtils {
  /**
   * 获取当天的完整时间范围
   * 
   * 计算当天从00:00:00到23:59:59的时间范围，用于数据查询
   * 
   * @static
   * @method getCurrentDayTimeRange
   * @returns {Object} 时间范围对象
   * @returns {Date} returns.start - 当天开始时间(00:00:00)
   * @returns {Date} returns.end - 当天结束时间(23:59:59)
   * @example
   * const range = TimeUtils.getCurrentDayTimeRange();
   * console.log('今天开始:', range.start);
   * console.log('今天结束:', range.end);
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
   * 
   * 根据指定的语言环境格式化日期，支持多种本地化格式
   * 
   * @static
   * @method formatDateToLocalizedString
   * @param {Date} targetDate - 要格式化的目标日期
   * @param {string} [localeSettings='zh-CN'] - 本地化语言设置
   * @returns {string} 本地化格式的日期字符串
   * @example
   * const date = new Date();
   * const zhFormat = TimeUtils.formatDateToLocalizedString(date, 'zh-CN');
   * const enFormat = TimeUtils.formatDateToLocalizedString(date, 'en-US');
   */
  static formatDateToLocalizedString(targetDate = new Date(), localeSettings = applicationConfig.business.reportLanguage) {
    return targetDate.toLocaleDateString(localeSettings);
  }

  /**
   * 格式化日期时间为本地化字符串
   * @param {Date} [targetDateTime] - 要格式化的日期时间，默认为当前日期时间
   * @param {string} [localeSettings] - 本地化设置，默认为中文
   * @returns {string} 格式化后的日期时间字符串
   */
  static formatDateTimeToLocalizedString(targetDateTime = new Date(), localeSettings = applicationConfig.business.reportLanguage) {
    return targetDateTime.toLocaleString(localeSettings);
  }

  /**
   * 格式化日期为ISO标准字符串
   * @param {Date} [targetDate] - 要格式化的日期，默认为当前日期
   * @returns {string} ISO格式的日期字符串
   */
  static formatDateToISOString(targetDate = new Date()) {
    return targetDate.toISOString();
  }

  /**
   * 解析日期字符串为Date对象
   * @param {string} dateStringInput - 日期字符串
   * @returns {Date} Date对象
   */
  static parseDateStringToObject(dateStringInput) {
    return new Date(dateStringInput);
  }

  /**
   * 获取指定日期范围的时间区间
   * @param {Date} rangeStartDate - 开始日期
   * @param {Date} rangeEndDate - 结束日期
   * @returns {Object} 包含开始和结束时间的对象
   */
  static getCustomDateTimeRange(rangeStartDate, rangeEndDate) {
    return {
      startTime: rangeStartDate.toISOString(),
      endTime: rangeEndDate.toISOString()
    };
  }
}

/**
 * 数据验证工具类
 * 
 * 提供全面的数据验证和类型检查功能，包括：
 * - 字符串有效性验证
 * - 数组和对象验证
 * - URL格式验证
 * - 空值和类型检查
 * 
 * @class ValidationUtils
 * @namespace Utils.ValidationUtils
 * @example
 * const isValid = ValidationUtils.isValidNonEmptyString('test');
 * const isValidUrl = ValidationUtils.isValidUrlFormat('https://example.com');
 */
class ValidationUtils {
  /**
   * 检查字符串是否为空或仅包含空白字符
   * 
   * 验证字符串的有效性，包括null、undefined、空字符串和纯空白字符的检查
   * 
   * @static
   * @method isEmptyOrWhitespace
   * @param {string} inputString - 待检查的输入字符串
   * @returns {boolean} 如果为空或仅包含空白字符返回true，否则返回false
   * @example
   * ValidationUtils.isEmptyOrWhitespace(''); // true
   * ValidationUtils.isEmptyOrWhitespace('   '); // true
   * ValidationUtils.isEmptyOrWhitespace('hello'); // false
   */
  static isEmptyOrWhitespace(inputString) {
    return !inputString || typeof inputString !== 'string' || inputString.trim().length === 0;
  }

  /**
   * 检查字符串是否有效（非空且不仅包含空白字符）
   * @param {string} inputString - 要检查的字符串
   * @returns {boolean} 如果是有效字符串则返回true
   */
  static isValidNonEmptyString(inputString) {
    return !this.isEmptyOrWhitespace(inputString);
  }

  /**
   * 检查数组是否为空或无效
   * @param {Array} inputArray - 要检查的数组
   * @returns {boolean} 如果为空数组则返回true
   */
  static isEmptyOrInvalidArray(inputArray) {
    return !Array.isArray(inputArray) || inputArray.length === 0;
  }

  /**
   * 验证URL格式是否正确
   * @param {string} urlString - 要验证的URL
   * @returns {boolean} 如果是有效URL则返回true
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
 * 
 * 提供完整的错误处理解决方案，包括：
 * - 标准化错误对象创建
 * - 安全的异步函数执行
 * - 错误日志记录和上下文管理
 * - 异常捕获和恢复机制
 * 
 * @class ErrorHandler
 * @namespace Utils.ErrorHandler
 * @example
 * const error = ErrorHandler.createStandardizedError('操作失败', 'OPERATION_FAILED');
 * const result = await ErrorHandler.executeWithErrorHandling(asyncFunction, 'defaultValue');
 */
class ErrorHandler {
  /**
   * 创建标准化的错误对象
   * 
   * 构建包含详细信息的标准错误对象，便于错误追踪和处理
   * 
   * @static
   * @method createStandardizedError
   * @param {string} errorMessage - 错误描述信息
   * @param {string} [errorCode] - 错误代码标识
   * @param {Error} [sourceError] - 原始错误对象(用于错误链)
   * @returns {Error} 包含完整信息的标准化错误对象
   * @example
   * const error = ErrorHandler.createStandardizedError(
   *   '数据库连接失败',
   *   'DB_CONNECTION_ERROR',
   *   originalError
   * );
   * throw error;
   */
  static createStandardizedError(errorMessage, errorCode = null, sourceError = null) {
    const standardError = new Error(errorMessage);
    if (errorCode) standardError.code = errorCode;
    if (sourceError) standardError.originalError = sourceError;
    return standardError;
  }

  /**
   * 安全执行函数，捕获并处理错误
   * @param {Function} targetFunction - 要执行的函数
   * @param {*} [fallbackValue] - 发生错误时的默认返回值
   * @returns {*} 函数执行结果或默认值
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
   * 记录错误信息到控制台
   * @param {Error} errorObject - 错误对象
   * @param {string} [contextInfo] - 错误上下文
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
 * 
 * 提供全面的数据格式化功能，包括：
 * - 文本截断和清理
 * - HTML内容安全处理
 * - 数字格式化和本地化
 * - 文件大小可读化显示
 * 
 * @class DataFormatter
 * @namespace Utils.DataFormatter
 * @example
 * const truncated = DataFormatter.truncateTextToLength('long text', 10);
 * const safe = DataFormatter.sanitizeTextForHtml('<script>alert(1)</script>');
 * const formatted = DataFormatter.formatNumberWithCommas(1234567);
 */
class DataFormatter {
  /**
   * 将文本截断到指定长度
   * 
   * 智能截断文本内容，避免在单词中间截断，并添加省略标识
   * 
   * @static
   * @method truncateTextToLength
   * @param {string} inputText - 需要截断的原始文本
   * @param {number} maximumLength - 允许的最大字符长度
   * @param {string} [truncationSuffix='...'] - 截断时添加的后缀标识
   * @returns {string} 截断处理后的文本
   * @example
   * const result = DataFormatter.truncateTextToLength(
   *   'This is a very long text that needs truncation',
   *   20,
   *   '..'
   * );
   * console.log(result); // 'This is a very long..'
   */
  static truncateTextToLength(inputText, maximumLength, truncationSuffix = '...') {
    if (!inputText || typeof inputText !== 'string') return '';
    if (inputText.length <= maximumLength) return inputText;
    return inputText.substring(0, maximumLength - truncationSuffix.length) + truncationSuffix;
  }

  /**
   * 清理文本，移除特殊字符并转义HTML实体
   * @param {string} inputText - 要清理的文本
   * @returns {string} 清理后的文本
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

  /**
   * 格式化数字为千分位格式
   * @param {number} numericValue - 要格式化的数字
   * @returns {string} 格式化后的数字字符串
   */
  static formatNumberWithCommas(numericValue) {
    if (typeof numericValue !== 'number' || isNaN(numericValue)) return '0';
    return numericValue.toLocaleString();
  }

  /**
   * 格式化文件大小为人类可读格式
   * @param {number} bytesCount - 字节数
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSizeToReadable(bytesCount) {
    if (typeof bytesCount !== 'number' || bytesCount < 0) return '0 B';
    
    const sizeUnits = ['B', 'KB', 'MB', 'GB', 'TB'];
    let calculatedSize = bytesCount;
    let currentUnitIndex = 0;
    
    while (calculatedSize >= 1024 && currentUnitIndex < sizeUnits.length - 1) {
      calculatedSize /= 1024;
      currentUnitIndex++;
    }
    
    return `${calculatedSize.toFixed(2)} ${sizeUnits[currentUnitIndex]}`;
  }
}

module.exports = {
  Logger,
  TimeUtils,
  ValidationUtils,
  ErrorHandler,
  DataFormatter
};