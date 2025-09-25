/**
 * Supabase 连接管理器
 * 解决免费版200连接限制问题，提供连接池管理和连接复用功能
 */

const { createClient } = require('@supabase/supabase-js');
const applicationConfig = require('../lib/config');
const Logger = require('../lib/utils').Logger;

/**
 * 数据库连接管理器类
 * 实现连接池、连接复用、超时管理等功能
 */
class DatabaseConnectionManager {
  constructor() {
    this.connectionPool = new Map(); // 连接池
    this.activeConnections = new Set(); // 活跃连接追踪
    this.connectionQueue = []; // 连接等待队列
    this.maxConnections = 150; // 最大连接数（预留50个缓冲）
    this.connectionTimeout = 30000; // 连接超时时间（30秒）
    this.idleTimeout = 60000; // 空闲连接超时时间（60秒）
    this.retryAttempts = 3; // 重试次数
    this.retryDelay = 1000; // 重试延迟（毫秒）
    this.cleanupTimer = null; // 清理定时器引用
    
    // 统计信息
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      queuedRequests: 0,
      successfulOperations: 0,
      failedOperations: 0,
      connectionReuses: 0
    };
    
    // 定期清理空闲连接
    this.startIdleConnectionCleanup();
  }

  /**
   * 获取数据库连接
   * @param {string} operationType - 操作类型（用于连接复用）
   * @returns {Promise<Object>} Supabase客户端实例
   */
  async getConnection(operationType = 'default') {
    try {
      // 检查是否有可复用的连接
      const reusableConnection = this.findReusableConnection(operationType);
      if (reusableConnection) {
        this.stats.connectionReuses++;
        Logger.debug(`[连接管理] 复用现有连接，类型: ${operationType}`);
        return reusableConnection;
      }

      // 检查连接数限制
      if (this.activeConnections.size >= this.maxConnections) {
        Logger.warn(`[连接管理] 达到最大连接数限制 ${this.maxConnections}，等待可用连接`);
        return await this.waitForAvailableConnection(operationType);
      }

      // 创建新连接
      return await this.createNewConnection(operationType);
    } catch (error) {
      this.stats.failedOperations++;
      Logger.error('[连接管理] 获取连接失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 释放数据库连接
   * @param {Object} connection - 连接对象
   * @param {string} operationType - 操作类型
   */
  async releaseConnection(connection, operationType = 'default') {
    try {
      if (!connection || !connection._connectionId) {
        Logger.warn('[连接管理] 尝试释放无效连接');
        return;
      }

      const connectionId = connection._connectionId;
      
      // 从活跃连接中移除
      this.activeConnections.delete(connectionId);
      
      // 将连接标记为空闲，可供复用
      const connectionInfo = this.connectionPool.get(connectionId);
      if (connectionInfo) {
        connectionInfo.isIdle = true;
        connectionInfo.lastUsed = Date.now();
        connectionInfo.operationType = operationType;
        
        Logger.debug(`[连接管理] 连接已释放并标记为空闲: ${connectionId}`);
      }

      // 处理等待队列
      this.processConnectionQueue();
      
      this.updateStats();
    } catch (error) {
      Logger.error('[连接管理] 释放连接失败', { error: error.message });
    }
  }

  /**
   * 查找可复用的连接
   * @param {string} operationType - 操作类型
   * @returns {Object|null} 可复用的连接或null
   */
  findReusableConnection(operationType) {
    for (const [connectionId, connectionInfo] of this.connectionPool) {
      if (connectionInfo.isIdle && 
          connectionInfo.operationType === operationType &&
          (Date.now() - connectionInfo.lastUsed) < this.idleTimeout) {
        
        // 标记为活跃
        connectionInfo.isIdle = false;
        connectionInfo.lastUsed = Date.now();
        this.activeConnections.add(connectionId);
        
        return connectionInfo.client;
      }
    }
    return null;
  }

  /**
   * 创建新的数据库连接
   * @param {string} operationType - 操作类型
   * @returns {Promise<Object>} Supabase客户端实例
   */
  async createNewConnection(operationType) {
    const supabaseConfig = applicationConfig.getSupabaseConfiguration();
    
    if (!supabaseConfig.databaseUrl || !supabaseConfig.serviceRoleKey) {
      throw new Error('Supabase配置不完整');
    }

    const client = createClient(supabaseConfig.databaseUrl, supabaseConfig.serviceRoleKey);
    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 为连接添加标识
    client._connectionId = connectionId;
    
    // 存储连接信息
    const connectionInfo = {
      client,
      connectionId,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      operationType,
      isIdle: false
    };
    
    this.connectionPool.set(connectionId, connectionInfo);
    this.activeConnections.add(connectionId);
    this.stats.totalConnections++;
    
    Logger.info(`[连接管理] 创建新连接: ${connectionId}, 类型: ${operationType}`);
    
    return client;
  }

  /**
   * 等待可用连接
   * @param {string} operationType - 操作类型
   * @returns {Promise<Object>} Supabase客户端实例
   */
  async waitForAvailableConnection(operationType) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.connectionQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.connectionQueue.splice(index, 1);
        }
        reject(new Error('等待连接超时'));
      }, this.connectionTimeout);

      this.connectionQueue.push({
        operationType,
        resolve: (connection) => {
          clearTimeout(timeoutId);
          resolve(connection);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      });
      
      this.stats.queuedRequests++;
    });
  }

  /**
   * 处理连接等待队列
   */
  async processConnectionQueue() {
    while (this.connectionQueue.length > 0 && this.activeConnections.size < this.maxConnections) {
      const queueItem = this.connectionQueue.shift();
      
      try {
        // 先尝试找到可复用的连接
        const reusableConnection = this.findReusableConnection(queueItem.operationType);
        if (reusableConnection) {
          queueItem.resolve(reusableConnection);
          continue;
        }
        
        // 创建新连接
        const newConnection = await this.createNewConnection(queueItem.operationType);
        queueItem.resolve(newConnection);
      } catch (error) {
        queueItem.reject(error);
      }
    }
  }

  /**
   * 启动空闲连接清理任务
   */
  startIdleConnectionCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, 30000); // 每30秒清理一次
  }

  /**
   * 清理空闲连接
   */
  cleanupIdleConnections() {
    const now = Date.now();
    const connectionsToRemove = [];
    
    for (const [connectionId, connectionInfo] of this.connectionPool) {
      if (connectionInfo.isIdle && (now - connectionInfo.lastUsed) > this.idleTimeout) {
        connectionsToRemove.push(connectionId);
      }
    }
    
    connectionsToRemove.forEach(connectionId => {
      this.connectionPool.delete(connectionId);
      this.activeConnections.delete(connectionId);
      Logger.debug(`[连接管理] 清理空闲连接: ${connectionId}`);
    });
    
    if (connectionsToRemove.length > 0) {
      Logger.info(`[连接管理] 清理了 ${connectionsToRemove.length} 个空闲连接`);
      this.updateStats();
    }
  }

  /**
   * 执行数据库操作（带重试机制）
   * @param {Function} operation - 数据库操作函数
   * @param {string} operationType - 操作类型
   * @returns {Promise<any>} 操作结果
   */
  async executeWithRetry(operation, operationType = 'default') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      let connection = null;
      
      try {
        connection = await this.getConnection(operationType);
        const result = await operation(connection);
        
        this.stats.successfulOperations++;
        return result;
      } catch (error) {
        lastError = error;
        Logger.warn(`[连接管理] 操作失败，尝试 ${attempt}/${this.retryAttempts}`, { error: error.message });
        
        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      } finally {
        if (connection) {
          await this.releaseConnection(connection, operationType);
        }
      }
    }
    
    this.stats.failedOperations++;
    throw lastError;
  }

  /**
   * 更新统计信息
   */
  updateStats() {
    this.stats.activeConnections = this.activeConnections.size;
    this.stats.queuedRequests = this.connectionQueue.length;
  }

  /**
   * 获取连接池统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    this.updateStats();
    return {
      ...this.stats,
      poolSize: this.connectionPool.size,
      maxConnections: this.maxConnections
    };
  }

  /**
   * 关闭所有连接
   */
  async closeAllConnections() {
    Logger.info('[连接管理] 开始关闭所有连接');
    
    // 清理定时器
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      Logger.info('[连接管理] 清理定时器已停止');
    }
    
    this.connectionPool.clear();
    this.activeConnections.clear();
    this.connectionQueue.length = 0;
    
    Logger.info('[连接管理] 所有连接已关闭');
  }
}

// 创建单例实例
const connectionManager = new DatabaseConnectionManager();

module.exports = {
  DatabaseConnectionManager,
  connectionManager
};