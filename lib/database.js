const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 存储推特数据到 Supabase
 * @param {Array} tweets - 推特数据数组
 * @returns {Promise<Object>} 存储结果
 */
async function storeTweetsToSupabase(tweets) {
  try {
    console.log('准备存储推特数据到 Supabase，数据条数:', tweets.length);
    
    const { data, error } = await supabase
      .from('tweets')
      .insert(tweets);

    if (error) {
      console.error('存储推特数据时发生错误:', error);
      throw error;
    }

    console.log('推特数据存储成功:', data);
    return { success: true, data };
  } catch (error) {
    console.error('存储推特数据失败:', error);
    throw error;
  }
}

/**
 * 从 Supabase 获取推特数据
 * @param {number} limit - 限制返回的数据条数
 * @returns {Promise<Array>} 推特数据数组
 */
async function getTweetsFromSupabase(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('tweets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('获取推特数据时发生错误:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('获取推特数据失败:', error);
    throw error;
  }
}

module.exports = {
  supabase,
  storeTweetsToSupabase,
  getTweetsFromSupabase
};