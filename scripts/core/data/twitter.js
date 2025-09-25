const Logger = require('../lib/utils').Logger;
const { TimezoneUtils } = require('../lib/timezone');

/**
 * 处理和格式化推特数据以便存储
 * @param {Array} rawTweetData - 原始推特数据数组
 * @returns {Array} 格式化后的推特数据数组
 */
function formatTweetDataForStorage(rawTweetData) {
  if (!Array.isArray(rawTweetData)) {
    Logger.warn('[推特数据处理] 输入的原始数据不是有效的数组格式');
    return [];
  }

  Logger.info(`[推特数据处理] 开始格式化 ${rawTweetData.length} 条原始推特数据`);

  const formattedTweetData = rawTweetData.map((tweetItem, itemIndex) => {
    try {
      return {
        content: tweetItem.content || '',
        author: tweetItem.author || 'Unknown',
        url: tweetItem.url || '',
        timestamp: tweetItem.timestamp || TimezoneUtils.getTimestamp(),
        list_id: tweetItem.list_id || 'default',
        created_at: TimezoneUtils.getTimestamp()
      };
    } catch (error) {
      Logger.error(`[推特数据处理] 格式化第 ${itemIndex + 1} 条推特数据时发生错误`, { error: error.message });
      return null;
    }
  }).filter(formattedTweet => formattedTweet !== null);

  Logger.info(`[推特数据处理] 数据格式化处理完成，有效推特数据 ${formattedTweetData.length} 条`);
  return formattedTweetData;
}

// 导出推特数据处理模块
module.exports = {
  formatTweetDataForStorage
};