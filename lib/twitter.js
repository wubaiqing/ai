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
  formatTweetData
};