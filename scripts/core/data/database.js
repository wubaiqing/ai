/**
 * Supabase 数据库操作模块
 * 提供推文数据的存储和查询功能
 * 使用连接管理器解决免费版200连接限制问题
 */

const Logger = require('../lib/utils').Logger;
const { connectionManager } = require('./connectionManager');
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 将推文数据存储到 Supabase 数据库
 * @param {Array} tweetDataArray - 推文数据数组
 * @returns {Promise<Object>} 数据存储结果
 */
async function storeTweetDataToSupabase(tweets) {
  if (!tweets || tweets.length === 0) {
    Logger.info('没有推文数据需要存储');
    return { success: true, count: 0, skipped: 0, message: '没有数据需要存储' };
  }

  const BATCH_SIZE = 10; // 每批处理10条数据
  Logger.info(`开始存储 ${tweets.length} 条推文数据到 Supabase，批量大小: ${BATCH_SIZE}`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let hasError = false;
  let errorMessage = '';

  // 分批处理数据
  for (let i = 0; i < tweets.length; i += BATCH_SIZE) {
    const batch = tweets.slice(i, i + BATCH_SIZE);
    
    try {
      const { data, error } = await supabase
        .from('tweets')
        .upsert(batch, { 
          onConflict: 'url',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        Logger.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 存储失败:`, error.message);
        hasError = true;
        errorMessage = error.message;
        continue;
      }

      const insertedCount = data ? data.length : 0;
      const skippedCount = batch.length - insertedCount;
      
      totalInserted += insertedCount;
      totalSkipped += skippedCount;
      
      Logger.info(`批次 ${Math.floor(i/BATCH_SIZE) + 1}: 新增 ${insertedCount} 条，跳过重复 ${skippedCount} 条`);
      
    } catch (err) {
      Logger.error(`批次 ${Math.floor(i/BATCH_SIZE) + 1} 处理异常:`, err.message);
      hasError = true;
      errorMessage = err.message;
    }
  }

  const result = {
    success: !hasError,
    count: totalInserted,
    skipped: totalSkipped,
    message: hasError ? errorMessage : `成功处理 ${tweets.length} 条推文`
  };

  Logger.info(`✅ 推文数据存储完成 - 总计新增: ${totalInserted} 条，跳过重复: ${totalSkipped} 条`);
  return result;
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
