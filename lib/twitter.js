const axios = require('axios');

/**
 * 从X.com RSS源获取推特列表数据
 * @param {string} listId - 推特列表ID
 * @param {string} token - X.com API Token
 * @returns {Promise<Array>} 推特数据数组
 */
async function getListTweets(listId, token) {
  if (!token || !listId) {
    throw new Error(
      'Missing required environment variables: X_TOKEN and X_LIST_ID'
    );
  }

  try {
    const url = `https://api.fxtwitter.com/list/${listId}/rss`;
    console.log('正在获取推特数据，URL:', url);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000, // 30秒超时
    });

    console.log('推特数据获取成功，状态码:', response.status);
    return response.data;
  } catch (error) {
    console.error('获取推特数据失败:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
    });
    throw error;
  }
}

/**
 * 处理和格式化推特数据
 * @param {*} rawData - 原始推特数据
 * @returns {Array} 格式化后的推特数据
 */
function formatTweetData(rawData) {
  try {
    // 这里可以根据实际的数据结构进行格式化
    // 目前先返回原始数据，后续可以根据需要进行处理
    if (Array.isArray(rawData)) {
      return rawData;
    }

    // 如果是单个对象，包装成数组
    return [rawData];
  } catch (error) {
    console.error('格式化推特数据失败:', error);
    return [];
  }
}

module.exports = {
  getListTweets,
  formatTweetData,
};
