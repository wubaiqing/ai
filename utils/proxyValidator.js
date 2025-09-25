/**
 * 代理配置验证工具
 * 提供代理连接测试和错误处理功能
 */

const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const net = require('net');

/**
 * 代理配置验证器
 */
class ProxyValidator {
  constructor(logger = console) {
    this.logger = logger;
  }

  /**
   * 验证代理配置是否完整
   * @returns {Object} 验证结果
   */
  validateConfig() {
    const config = {
      host: process.env.PROXY_HOST,
      port: process.env.PROXY_PORT,
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
      url: this.buildProxyUrl()
    };

    const result = {
      isValid: false,
      config: config,
      errors: [],
      warnings: []
    };

    // 检查必需的配置
    if (!config.host) {
      result.errors.push('PROXY_HOST 未设置');
    }
    if (!config.port) {
      result.errors.push('PROXY_PORT 未设置');
    }

    // 检查认证配置的完整性
    if (config.username && !config.password) {
      result.warnings.push('设置了用户名但未设置密码');
    }
    if (!config.username && config.password) {
      result.warnings.push('设置了密码但未设置用户名');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * 测试TCP连接到代理服务器
   * @param {string} host 代理主机
   * @param {number} port 代理端口
   * @param {number} timeout 超时时间（毫秒）
   * @returns {Promise<boolean>} 连接是否成功
   */
  testTcpConnection(host, port, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error(`TCP连接超时 (${timeout}ms)`));
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        reject(err);
      });
      
      socket.connect(port, host);
    });
  }

  /**
   * 构建代理URL
   * @param {Object} config 代理配置
   * @returns {string} 代理URL
   */
  buildProxyUrl(config = {}) {
    const host = config.host || process.env.PROXY_HOST;
    const port = config.port || process.env.PROXY_PORT;
    const username = config.username || process.env.PROXY_USERNAME;
    const password = config.password || process.env.PROXY_PASSWORD;

    if (username && password) {
      return `http://${username}:${password}@${host}:${port}`;
    } else {
      return `http://${host}:${port}`;
    }
  }

  /**
   * 测试代理连接
   * @param {Object} options 测试选项
   * @returns {Promise<Object>} 测试结果
   */
  async testProxyConnection(options = {}) {
    const {
      testUrl = 'http://httpbin.org/ip',
      timeout = 10000,
      config = {}
    } = options;

    const result = {
      success: false,
      statusCode: null,
      error: null,
      response: null,
      proxyUrl: null
    };

    try {
      const proxyUrl = this.buildProxyUrl(config);
      result.proxyUrl = proxyUrl.replace(/:([^:@]+)@/, ':***@'); // 隐藏密码

      const axiosInstance = axios.create({
        timeout: timeout,
        httpAgent: new HttpProxyAgent(proxyUrl),
        httpsAgent: new HttpsProxyAgent(proxyUrl),
        validateStatus: () => true // 接受所有状态码
      });

      const response = await axiosInstance.get(testUrl);
      result.statusCode = response.status;
      result.response = response.data;

      if (response.status === 200) {
        result.success = true;
      } else if (response.status === 407) {
        result.error = '代理需要认证，请检查用户名和密码';
      } else if (response.status === 502) {
        result.error = '代理服务器错误，可能是认证失败或服务器配置问题';
      } else {
        result.error = `代理返回状态码: ${response.status}`;
      }

    } catch (error) {
      result.error = error.message;
      
      if (error.code === 'ECONNREFUSED') {
        result.error = '无法连接到代理服务器，请检查地址和端口';
      } else if (error.code === 'ENOTFOUND') {
        result.error = '无法解析代理服务器地址，请检查域名';
      } else if (error.code === 'ETIMEDOUT') {
        result.error = '连接代理服务器超时';
      }
    }

    return result;
  }

  /**
   * 完整的代理验证流程
   * @param {Object} options 验证选项
   * @returns {Promise<Object>} 验证结果
   */
  async validateProxy(options = {}) {
    const { verbose = false } = options;
    
    if (verbose) {
      this.logger.info('🔍 开始代理配置验证...');
    }

    // 1. 验证配置
    const configValidation = this.validateConfig();
    if (!configValidation.isValid) {
      return {
        success: false,
        stage: 'config',
        errors: configValidation.errors,
        warnings: configValidation.warnings
      };
    }

    if (verbose && configValidation.warnings.length > 0) {
      this.logger.warn('⚠️  配置警告:', configValidation.warnings);
    }

    // 2. 测试TCP连接
    if (verbose) {
      this.logger.info('🌐 测试TCP连接...');
    }
    
    try {
      await this.testTcpConnection(
        configValidation.config.host,
        parseInt(configValidation.config.port)
      );
      if (verbose) {
        this.logger.info('✅ TCP连接成功');
      }
    } catch (error) {
      return {
        success: false,
        stage: 'tcp',
        error: error.message
      };
    }

    // 3. 测试代理连接
    if (verbose) {
      this.logger.info('🔗 测试代理连接...');
    }
    
    const proxyTest = await this.testProxyConnection(options);
    
    if (proxyTest.success) {
      if (verbose) {
        this.logger.info('✅ 代理连接成功');
      }
      return {
        success: true,
        stage: 'complete',
        result: proxyTest
      };
    } else {
      return {
        success: false,
        stage: 'proxy',
        error: proxyTest.error,
        statusCode: proxyTest.statusCode
      };
    }
  }

  /**
   * 获取代理错误的建议解决方案
   * @param {Object} validationResult 验证结果
   * @returns {Array} 建议列表
   */
  getSuggestions(validationResult) {
    const suggestions = [];

    if (validationResult.stage === 'config') {
      suggestions.push('检查.env文件中的代理配置');
      suggestions.push('确保PROXY_HOST和PROXY_PORT已正确设置');
    } else if (validationResult.stage === 'tcp') {
      suggestions.push('检查代理服务器是否正在运行');
      suggestions.push('验证代理服务器地址和端口是否正确');
      suggestions.push('检查网络连接和防火墙设置');
    } else if (validationResult.stage === 'proxy') {
      if (validationResult.statusCode === 407) {
        suggestions.push('检查代理用户名和密码是否正确');
        suggestions.push('确认代理服务器需要认证');
      } else if (validationResult.statusCode === 502) {
        suggestions.push('检查代理服务器配置');
        suggestions.push('验证代理服务器支持HTTP CONNECT方法');
        suggestions.push('联系代理服务器管理员');
      } else {
        suggestions.push('检查代理服务器日志');
        suggestions.push('尝试使用其他代理客户端测试');
      }
    }

    return suggestions;
  }
}

module.exports = ProxyValidator;