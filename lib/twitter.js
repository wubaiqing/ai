/**
 * 处理和格式化推特数据以便存储
 * @param {Array} rawTweetData - 原始推特数据数组
 * @returns {Array} 格式化后的推特数据数组
 */
function formatTweetDataForStorage(rawTweetData) {
  if (!Array.isArray(rawTweetData)) {
    console.warn('[推特数据处理] 输入的原始数据不是有效的数组格式');
    return [];
  }

  console.log(`[推特数据处理] 开始格式化 ${rawTweetData.length} 条原始推特数据`);

  const formattedTweetData = rawTweetData.map((tweetItem, itemIndex) => {
    try {
      return {
        content: tweetItem.content || '',
        author: tweetItem.author || 'Unknown',
        url: tweetItem.url || '',
        timestamp: tweetItem.timestamp || new Date().toISOString(),
        list_id: tweetItem.list_id || 'default',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[推特数据处理] 格式化第 ${itemIndex + 1} 条推特数据时发生错误:`, error.message);
      return null;
    }
  }).filter(formattedTweet => formattedTweet !== null);

  console.log(`[推特数据处理] 数据格式化处理完成，有效推特数据 ${formattedTweetData.length} 条`);
  return formattedTweetData;
}

// 导出推特数据处理模块
module.exports = {
  formatTweetDataForStorage
};