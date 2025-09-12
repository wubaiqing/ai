/**
 * Supabase 数据库操作模块
 * 提供推文数据的存储和查询功能
 */

const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[数据库] 缺少 Supabase 环境变量');
  console.error('[数据库] 请确保 .env 文件中包含 SUPABASE_URL 和 SUPABASE_ANON_KEY');
  throw new Error('Missing Supabase environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('[数据库] Supabase 客户端初始化成功');

/**
 * 存储推特数据到 Supabase
 * @param {Array} tweets - 推特数据数组
 * @returns {Promise<Object>} 存储结果
 */
async function storeTweetsToSupabase(tweets) {
  if (!Array.isArray(tweets) || tweets.length === 0) {
    console.warn('[数据库] 推文数据为空或格式不正确');
    return { success: false, message: '推文数据为空' };
  }

  try {
    console.log(`[数据库] 开始存储推文数据，共 ${tweets.length} 条`);

    // 对推文数据进行去重处理，基于 url 字段
    const uniqueTweets = tweets.filter((tweet, index, self) => 
      index === self.findIndex(t => t.url === tweet.url)
    );
    
    if (uniqueTweets.length !== tweets.length) {
      console.log(`[数据库] 去重处理：原始 ${tweets.length} 条，去重后 ${uniqueTweets.length} 条`);
    }

    // 使用 upsert 操作处理重复数据，基于 url 字段进行冲突检测
    const { data, error } = await supabase
      .from('tweets')
      .upsert(uniqueTweets, { 
        onConflict: 'url',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('[数据库] 存储推文数据失败:', error.message);
      console.error('[数据库] 错误详情:', error);
      throw new Error(`数据库存储失败: ${error.message}`);
    }

    console.log(`[数据库] 推文数据存储成功，共 ${uniqueTweets.length} 条`);
    return { success: true, data, count: uniqueTweets.length };
  } catch (error) {
    console.error('[数据库] 存储操作异常:', error.message);
    throw error;
  }
}

/**
 * 从 Supabase 获取推特数据
 * @param {number} limit - 限制返回的数据条数，默认 100
 * @param {string} listId - 可选的列表 ID 过滤
 * @returns {Promise<Array>} 推文数据数组
 */
async function getTweetsFromSupabase(limit = 100, listId = null) {
  try {
    console.log(`[数据库] 开始查询推文数据，限制条数: ${limit}${listId ? `, 列表ID: ${listId}` : ''}`);

    let query = supabase
      .from('tweets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (listId) {
      query = query.eq('list_id', listId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[数据库] 查询推文数据失败:', error.message);
      console.error('[数据库] 错误详情:', error);
      throw new Error(`数据库查询失败: ${error.message}`);
    }

    const resultCount = data ? data.length : 0;
    console.log(`[数据库] 推文数据查询成功，返回 ${resultCount} 条记录`);
    return data || [];
  } catch (error) {
    console.error('[数据库] 查询操作异常:', error.message);
    throw error;
  }
}

module.exports = {
  supabase,
  storeTweetsToSupabase,
  getTweetsFromSupabase,
};
