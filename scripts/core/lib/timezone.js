/**
 * 统一时区配置模块
 * 集中管理所有时区相关的设置和格式化函数
 */

/**
 * 时区配置常量
 */
const TIMEZONE_CONFIG = {
  // 中国时区
  TIMEZONE: 'Asia/Shanghai',
  // 中文本地化设置
  LOCALE: 'zh-CN',
  // 日期时间格式选项
  DATE_OPTIONS: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  },
  DATETIME_OPTIONS: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  },
  TIME_OPTIONS: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Shanghai'
  }
};

/**
 * 时区工具类
 * 提供统一的时间格式化方法
 */
class TimezoneUtils {
  /**
   * 获取当前中国时区的时间戳字符串
   * 格式: YYYY-MM-DD HH:mm:ss
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的时间戳
   */
  static getTimestamp(date = new Date()) {
    return date.toLocaleString(TIMEZONE_CONFIG.LOCALE, TIMEZONE_CONFIG.DATETIME_OPTIONS)
      .replace(/\//g, '-'); // 将斜杠替换为横杠
  }

  /**
   * 获取当前中国时区的日期字符串
   * 格式: YYYY-MM-DD
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的日期
   */
  static getDate(date = new Date()) {
    return date.toLocaleDateString(TIMEZONE_CONFIG.LOCALE, TIMEZONE_CONFIG.DATE_OPTIONS)
      .replace(/\//g, '-'); // 将斜杠替换为横杠
  }

  /**
   * 获取当前中国时区的时间字符串
   * 格式: HH:mm:ss
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的时间
   */
  static getTime(date = new Date()) {
    return date.toLocaleTimeString(TIMEZONE_CONFIG.LOCALE, TIMEZONE_CONFIG.TIME_OPTIONS);
  }

  /**
   * 获取日志专用的时间戳格式
   * 格式: [YYYY-MM-DD HH:mm:ss]
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 带方括号的时间戳
   */
  static getLogTimestamp(date = new Date()) {
    return `[${this.getTimestamp(date)}]`;
  }

  /**
   * 获取文件名专用的日期格式
   * 格式: YYYY-MM-DD
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 适用于文件名的日期
   */
  static getFileDate(date = new Date()) {
    return this.getDate(date);
  }

  /**
   * 获取ISO格式但使用中国时区的字符串
   * 主要用于需要标准格式但要显示本地时间的场景
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} ISO格式的本地时间
   */
  static getISOLocalString(date = new Date()) {
    const timestamp = this.getTimestamp(date);
    return timestamp.replace(' ', 'T');
  }

  /**
   * 获取时区配置信息
   * @returns {Object} 时区配置对象
   */
  static getConfig() {
    return { ...TIMEZONE_CONFIG };
  }

  /**
   * 格式化日期
   * 格式: YYYY-MM-DD
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的日期
   */
  static formatDate(date = new Date()) {
    return this.getDate(date);
  }

  /**
   * 格式化日期时间
   * 格式: YYYY-MM-DD HH:mm:ss
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的日期时间
   */
  static formatDateTime(date = new Date()) {
    return this.getTimestamp(date);
  }

  /**
   * 格式化时间
   * 格式: HH:mm:ss
   * @param {Date} [date=new Date()] - 日期对象
   * @returns {string} 格式化的时间
   */
  static formatTime(date = new Date()) {
    return this.getTime(date);
  }

  /**
   * 格式化时间差
   * @param {number} milliseconds - 毫秒数
   * @returns {string} 格式化的时间差
   */
  static formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时${minutes % 60}分${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

module.exports = {
  TimezoneUtils,
  TIMEZONE_CONFIG
};