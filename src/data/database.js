/**
 * Supabase 数据库操作模块
 * 提供推文数据的存储和查询功能
 */

const { createClient } = require('@supabase/supabase-js');
const applicationConfig = require('../lib/config');

// 初始化 Supabase 数据库客户端
const supabaseConfiguration = applicationConfig.getSupabaseConfiguration();
const supabaseDatabaseClient = createClient(supabaseConfiguration.databaseUrl, supabaseConfiguration.serviceRoleKey);

/**
 * 将推文数据存储到 Supabase 数据库
 * @param {Array} tweetDataArray - 推文数据数组
 * @returns {Promise<Object>} 数据存储结果
 */
async function storeTweetDataToSupabase(tweetDataArray) {
  if (!Array.isArray(tweetDataArray) || tweetDataArray.length === 0) {
    console.warn('[数据库] 推文数据为空或格式不正确');
    return { success: false, message: '推文数据为空' };
  }

  try {
    console.log(`[数据库] 开始存储推文数据，共 ${tweetDataArray.length} 条`);

    // 对推文数据进行去重处理，基于 url 字段
    console.log(`[数据库] 开始去重处理，原始数据 ${tweetDataArray.length} 条`);
    
    // 统计URL重复情况
    const urlCounts = {};
    tweetDataArray.forEach(tweet => {
      urlCounts[tweet.url] = (urlCounts[tweet.url] || 0) + 1;
    });
    
    const duplicateUrls = Object.entries(urlCounts).filter(([url, count]) => count > 1);
    if (duplicateUrls.length > 0) {
      console.log(`[数据库] 发现重复URL ${duplicateUrls.length} 个:`);
      duplicateUrls.slice(0, 5).forEach(([url, count]) => {
        console.log(`  - ${url}: ${count} 次`);
      });
      if (duplicateUrls.length > 5) {
        console.log(`  - ... 还有 ${duplicateUrls.length - 5} 个重复URL`);
      }
    }
    
    const uniqueTweets = tweetDataArray.filter((tweet, index, self) => 
      index === self.findIndex(t => t.url === tweet.url)
    );
    
    const duplicatesRemoved = tweetDataArray.length - uniqueTweets.length;
    console.log(`[数据库] 去重处理：原始 ${tweetDataArray.length} 条，去重后 ${uniqueTweets.length} 条，移除重复 ${duplicatesRemoved} 条`);

    // 使用 upsert 操作处理重复数据，基于 url 字段进行冲突检测
    const { data: insertedData, error: insertionError } = await supabaseDatabaseClient
      .from('tweets')
      .upsert(uniqueTweets, { 
        onConflict: 'url',
        ignoreDuplicates: false 
      });

    if (insertionError) {
      console.error('[数据库] 存储推文数据失败:', insertionError.message);
      console.error('[数据库] 错误详情:', insertionError);
      throw new Error(`数据库存储失败: ${insertionError.message}`);
    }

    console.log(`[数据库] 推文数据存储成功，共 ${uniqueTweets.length} 条`);
    return { success: true, data: insertedData, count: uniqueTweets.length };
  } catch (error) {
    console.error('[数据库] 存储操作异常:', error.message);
    throw error;
  }
}

/**
 * 从 Supabase 数据库获取推文数据
 * @param {number} limit - 限制返回的数据条数，默认 100
 * @param {string} listId - 可选的列表 ID 过滤
 * @returns {Promise<Array>} 推文数据数组
 */
async function retrieveTweetDataFromSupabase(limit = 100, listId = null) {
  try {
    console.log(`[数据库] 开始查询推文数据，限制条数: ${limit}${listId ? `, 列表ID: ${listId}` : ''}`);

    let databaseQuery = supabaseDatabaseClient
      .from('tweets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (listId) {
      databaseQuery = databaseQuery.eq('list_id', listId);
    }

    const { data: retrievedData, error: queryError } = await databaseQuery;

    if (queryError) {
      console.error('[数据库] 查询推文数据失败:', queryError.message);
      console.error('[数据库] 错误详情:', queryError);
      throw new Error(`数据库查询失败: ${queryError.message}`);
    }

    const resultCount = retrievedData ? retrievedData.length : 0;
    console.log(`[数据库] 推文数据查询成功，返回 ${resultCount} 条记录`);
    return retrievedData || [];
  } catch (error) {
    console.error('[数据库] 查询操作异常:', error.message);
    throw error;
  }
}

// 导出数据库操作函数
module.exports = {
  supabaseDatabaseClient,
  storeTweetDataToSupabase,
  retrieveTweetDataFromSupabase,
};
