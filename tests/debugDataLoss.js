/**
 * 数据丢失调试脚本
 * 用于分析推文数据爬取和存储过程中的数据丢失问题
 */

const { retrieveTweetDataFromSupabase } = require('../src/data/database');
const fs = require('fs');
const path = require('path');

/**
 * 分析数据库中的推文数据
 */
async function analyzeDatabaseTweets() {
  console.log('=== 开始分析数据库推文数据 ===');
  
  try {
    // 获取所有推文数据
    const allTweets = await retrieveTweetDataFromSupabase(1000);
    console.log(`数据库中总推文数量: ${allTweets.length}`);
    
    // 按日期分组统计
    const tweetsByDate = {};
    const today = new Date().toISOString().split('T')[0];
    
    allTweets.forEach(tweet => {
      const tweetDate = new Date(tweet.created_at).toISOString().split('T')[0];
      if (!tweetsByDate[tweetDate]) {
        tweetsByDate[tweetDate] = [];
      }
      tweetsByDate[tweetDate].push(tweet);
    });
    
    console.log('\n=== 按日期统计推文数量 ===');
    Object.keys(tweetsByDate).sort().forEach(date => {
      console.log(`${date}: ${tweetsByDate[date].length} 条推文`);
    });
    
    // 分析今日推文
    const todayTweets = tweetsByDate[today] || [];
    console.log(`\n=== 今日推文详细分析 (${today}) ===`);
    console.log(`今日推文总数: ${todayTweets.length}`);
    
    if (todayTweets.length > 0) {
      // 检查URL重复情况
      const urls = todayTweets.map(t => t.url);
      const uniqueUrls = [...new Set(urls)];
      console.log(`唯一URL数量: ${uniqueUrls.length}`);
      
      if (urls.length !== uniqueUrls.length) {
        console.log('⚠️  发现重复URL!');
        const duplicates = urls.filter((url, index) => urls.indexOf(url) !== index);
        console.log('重复的URL:', duplicates);
      }
      
      // 检查空内容
      const emptyContentTweets = todayTweets.filter(t => !t.content || t.content.trim() === '');
      console.log(`空内容推文数量: ${emptyContentTweets.length}`);
      
      // 检查空URL
      const emptyUrlTweets = todayTweets.filter(t => !t.url || t.url.trim() === '');
      console.log(`空URL推文数量: ${emptyUrlTweets.length}`);
      
      // 显示前5条推文样本
      console.log('\n=== 推文样本 (前5条) ===');
      todayTweets.slice(0, 5).forEach((tweet, index) => {
        console.log(`${index + 1}. URL: ${tweet.url}`);
        console.log(`   内容: ${tweet.content ? tweet.content.substring(0, 100) + '...' : '(空内容)'}`);
        console.log(`   创建时间: ${tweet.created_at}`);
        console.log('---');
      });
    }
    
  } catch (error) {
    console.error('分析数据库数据失败:', error.message);
  }
}

/**
 * 模拟去重过程分析
 */
function simulateDeduplication() {
  console.log('\n=== 模拟去重过程分析 ===');
  
  // 模拟309条数据的去重场景
  const mockTweets = [];
  
  // 生成模拟数据：假设有很多重复的URL
  for (let i = 1; i <= 309; i++) {
    // 模拟重复URL的情况：每10条推文中有重复
    const urlId = Math.floor((i - 1) / 10) + 1;
    mockTweets.push({
      content: `推文内容 ${i}`,
      url: `https://x.com/user/status/${urlId}`,
      created_at: new Date().toISOString()
    });
  }
  
  console.log(`原始推文数量: ${mockTweets.length}`);
  
  // 模拟前端去重 (基于整个对象)
  const frontendDeduped = [...new Set(mockTweets)];
  console.log(`前端去重后数量: ${frontendDeduped.length}`);
  
  // 模拟后端去重 (基于URL)
  const backendDeduped = mockTweets.filter((tweet, index, self) => 
    index === self.findIndex(t => t.url === tweet.url)
  );
  console.log(`后端去重后数量: ${backendDeduped.length}`);
  
  // 分析URL分布
  const urlCounts = {};
  mockTweets.forEach(tweet => {
    urlCounts[tweet.url] = (urlCounts[tweet.url] || 0) + 1;
  });
  
  console.log('\nURL重复统计:');
  Object.entries(urlCounts).slice(0, 5).forEach(([url, count]) => {
    console.log(`${url}: ${count} 次`);
  });
}

/**
 * 检查爬取过程中的问题
 */
function analyzeScrapingIssues() {
  console.log('\n=== 爬取过程问题分析 ===');
  
  console.log('可能的数据丢失原因:');
  console.log('1. 前端去重问题: 第135行使用 [...new Set()] 对对象数组去重无效');
  console.log('   - Set 对对象进行去重时，比较的是对象引用，不是内容');
  console.log('   - 即使URL相同，不同的对象实例也会被保留');
  
  console.log('\n2. 后端去重: 基于URL字段进行去重');
  console.log('   - 数据库表有 UNIQUE 约束在 url 字段上');
  console.log('   - storeTweetDataToSupabase 函数会过滤重复URL');
  
  console.log('\n3. 可能的真实情况:');
  console.log('   - 爬取到的309条推文中，很多是重复的URL');
  console.log('   - 前端去重实际上没有起作用');
  console.log('   - 后端去重正确地过滤了重复URL，只保留31条唯一推文');
  
  console.log('\n4. 验证方法:');
  console.log('   - 检查爬取日志中是否有重复URL');
  console.log('   - 修改前端去重逻辑，使用正确的URL去重方法');
  console.log('   - 添加详细的去重日志');
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 数据丢失问题调试工具\n');
  
  await analyzeDatabaseTweets();
  simulateDeduplication();
  analyzeScrapingIssues();
  
  console.log('\n=== 建议的解决方案 ===');
  console.log('1. 修复前端去重逻辑: 使用URL字段进行去重');
  console.log('2. 添加详细的去重日志，显示每一步的数据变化');
  console.log('3. 在爬取过程中记录重复URL的统计信息');
  console.log('4. 考虑是否需要保留同一URL的多次爬取记录');
}

// 运行调试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  analyzeDatabaseTweets,
  simulateDeduplication,
  analyzeScrapingIssues
};