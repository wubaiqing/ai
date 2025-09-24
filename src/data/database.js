/**
 * Supabase 数据库操作模块
 * 提供推文数据的存储和查询功能
 * 使用连接管理器解决免费版200连接限制问题
 */

const { connectionManager } = require('./connectionManager');
const Logger = require('../lib/utils').Logger;

/**
 * 将推文数据存储到 Supabase 数据库
 * @param {Array} tweetDataArray - 推文数据数组
 * @returns {Promise<Object>} 数据存储结果
 */
async function storeTweetDataToSupabase(tweetDataArray) {
  if (!Array.isArray(tweetDataArray) || tweetDataArray.length === 0) {
    Logger.warn('[数据库] 推文数据为空或格式不正确');
    return { success: false, message: '推文数据为空' };
  }

  return await connectionManager.executeWithRetry(async (client) => {
    Logger.info(`[数据库] 开始存储推文数据，共 ${tweetDataArray.length} 条`);

    // 对推文数据进行去重处理，基于 url 字段
    Logger.info(`[数据库] 开始去重处理，原始数据 ${tweetDataArray.length} 条`);
    
    // 统计URL重复情况
    const urlCounts = {};
    tweetDataArray.forEach(tweet => {
      urlCounts[tweet.url] = (urlCounts[tweet.url] || 0) + 1;
    });
    
    const duplicateUrls = Object.entries(urlCounts).filter(([url, count]) => count > 1);
    if (duplicateUrls.length > 0) {
      Logger.info(`[数据库] 发现重复URL ${duplicateUrls.length} 个:`);
      duplicateUrls.slice(0, 5).forEach(([url, count]) => {
        Logger.info(`  - ${url}: ${count} 次`);
      });
      if (duplicateUrls.length > 5) {
        Logger.info(`  - ... 还有 ${duplicateUrls.length - 5} 个重复URL`);
      }
    }
    
    const uniqueTweets = tweetDataArray.filter((tweet, index, self) => 
      index === self.findIndex(t => t.url === tweet.url)
    );
    
    const duplicatesRemoved = tweetDataArray.length - uniqueTweets.length;
    Logger.info(`[数据库] 去重处理：原始 ${tweetDataArray.length} 条，去重后 ${uniqueTweets.length} 条，移除重复 ${duplicatesRemoved} 条`);

    // 批量处理数据，每次最多处理100条
    const batchSize = 100;
    let totalInserted = 0;
    const results = [];

    for (let i = 0; i < uniqueTweets.length; i += batchSize) {
      const batch = uniqueTweets.slice(i, i + batchSize);
      
      const { data: insertedData, error: insertionError } = await client
        .from('tweets')
        .upsert(batch, { 
          onConflict: 'url',
          ignoreDuplicates: false 
        });

      if (insertionError) {
        Logger.error('[数据库] 批量存储失败', { 
          error: insertionError.message, 
          batchIndex: Math.floor(i / batchSize) + 1,
          batchSize: batch.length
        });
        throw new Error(`数据库存储失败: ${insertionError.message}`);
      }

      totalInserted += batch.length;
      results.push(insertedData);
      
      Logger.debug(`[数据库] 批量 ${Math.floor(i / batchSize) + 1} 存储成功，${batch.length} 条数据`);
    }

    Logger.info(`[数据库] 推文数据存储成功，共 ${totalInserted} 条`);
    return { success: true, data: results.flat(), count: totalInserted };
  }, 'store_tweets');
}

/**
 * 从 Supabase 数据库获取推文数据
 * @param {number} limit - 限制返回的数据条数，默认 100
 * @param {string} listId - 可选的列表 ID 过滤
 * @returns {Promise<Array>} 推文数据数组
 */
async function retrieveTweetDataFromSupabase(limit = 100, listId = null) {
  return await connectionManager.executeWithRetry(async (client) => {
    Logger.info(`[数据库] 开始查询推文数据，限制条数: ${limit}${listId ? `, 列表ID: ${listId}` : ''}`);

    let databaseQuery = client
      .from('tweets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (listId) {
      databaseQuery = databaseQuery.eq('list_id', listId);
    }

    const { data: retrievedData, error: queryError } = await databaseQuery;

    if (queryError) {
      Logger.error('[数据库] 查询推文数据失败', { error: queryError.message });
      Logger.error('[数据库] 错误详情', { error: queryError });
      throw new Error(`数据库查询失败: ${queryError.message}`);
    }

    const resultCount = retrievedData ? retrievedData.length : 0;
    Logger.info(`[数据库] 推文数据查询成功，返回 ${resultCount} 条记录`);
    return retrievedData || [];
  }, 'retrieve_tweets');
}

/**
 * 获取连接池统计信息
 * @returns {Object} 连接池统计信息
 */
function getConnectionStats() {
  return connectionManager.getStats();
}

/**
 * 关闭所有数据库连接
 * @returns {Promise<void>}
 */
async function closeAllConnections() {
  return await connectionManager.closeAllConnections();
}

// 导出数据库操作函数
module.exports = {
  storeTweetDataToSupabase,
  retrieveTweetDataFromSupabase,
  getConnectionStats,
  closeAllConnections,
  connectionManager
};
