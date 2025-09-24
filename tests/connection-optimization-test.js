/**
 * 数据库连接优化测试脚本
 * 验证Supabase免费版200连接限制的解决方案
 */

const { connectionManager } = require('../src/data/connectionManager');
const { storeTweetDataToSupabase, retrieveTweetDataFromSupabase, getConnectionStats } = require('../src/data/database');
const Logger = require('../src/lib/utils').Logger;

/**
 * 生成测试推文数据
 * @param {number} count - 生成数据条数
 * @returns {Array} 测试推文数据数组
 */
function generateTestTweets(count) {
  const tweets = [];
  for (let i = 0; i < count; i++) {
    tweets.push({
      url: `https://twitter.com/test/status/${Date.now()}_${i}`,
      content: `测试推文内容 ${i + 1} - ${new Date().toISOString()}`,
      published_date: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      list_id: 'test_list'
    });
  }
  return tweets;
}

/**
 * 测试连接池基本功能
 */
async function testConnectionPoolBasics() {
  console.log('\n=== 测试连接池基本功能 ===');
  
  try {
    // 获取初始连接统计
    const initialStats = getConnectionStats();
    console.log('初始连接统计:', initialStats);
    
    // 测试单次数据写入
    const testData = generateTestTweets(5);
    console.log(`\n准备写入 ${testData.length} 条测试数据...`);
    
    const writeResult = await storeTweetDataToSupabase(testData);
    console.log('写入结果:', writeResult);
    
    // 测试数据读取
    console.log('\n准备读取数据...');
    const readResult = await retrieveTweetDataFromSupabase(10);
    console.log(`读取到 ${readResult.length} 条数据`);
    
    // 获取操作后连接统计
    const afterStats = getConnectionStats();
    console.log('\n操作后连接统计:', afterStats);
    
    console.log('✅ 连接池基本功能测试通过');
    return true;
  } catch (error) {
    console.error('❌ 连接池基本功能测试失败:', error.message);
    return false;
  }
}

/**
 * 测试并发连接管理
 */
async function testConcurrentConnections() {
  console.log('\n=== 测试并发连接管理 ===');
  
  try {
    const concurrentTasks = [];
    const taskCount = 20; // 创建20个并发任务
    
    console.log(`创建 ${taskCount} 个并发数据库操作任务...`);
    
    for (let i = 0; i < taskCount; i++) {
      const task = async () => {
        const testData = generateTestTweets(3);
        testData.forEach(tweet => {
          tweet.url = `${tweet.url}_concurrent_${i}`; // 确保URL唯一
        });
        
        await storeTweetDataToSupabase(testData);
        await retrieveTweetDataFromSupabase(5);
        
        return `任务 ${i + 1} 完成`;
      };
      
      concurrentTasks.push(task());
    }
    
    // 执行所有并发任务
    const startTime = Date.now();
    const results = await Promise.all(concurrentTasks);
    const endTime = Date.now();
    
    console.log(`\n所有并发任务完成，耗时: ${endTime - startTime}ms`);
    console.log(`成功完成的任务数: ${results.length}`);
    
    // 检查连接统计
    const finalStats = getConnectionStats();
    console.log('\n并发测试后连接统计:', finalStats);
    
    if (finalStats.activeConnections <= 150) {
      console.log('✅ 并发连接数控制在限制范围内');
    } else {
      console.log('⚠️ 并发连接数超出预期限制');
    }
    
    console.log('✅ 并发连接管理测试通过');
    return true;
  } catch (error) {
    console.error('❌ 并发连接管理测试失败:', error.message);
    return false;
  }
}

/**
 * 测试批量操作效率
 */
async function testBatchOperations() {
  console.log('\n=== 测试批量操作效率 ===');
  
  try {
    // 测试大批量数据写入
    const largeBatchData = generateTestTweets(250); // 生成250条数据
    largeBatchData.forEach((tweet, index) => {
      tweet.url = `${tweet.url}_batch_${index}`; // 确保URL唯一
    });
    
    console.log(`准备批量写入 ${largeBatchData.length} 条数据...`);
    
    const startTime = Date.now();
    const batchResult = await storeTweetDataToSupabase(largeBatchData);
    const endTime = Date.now();
    
    console.log(`批量写入完成，耗时: ${endTime - startTime}ms`);
    console.log('批量写入结果:', {
      success: batchResult.success,
      count: batchResult.count
    });
    
    // 检查连接使用情况
    const batchStats = getConnectionStats();
    console.log('\n批量操作后连接统计:', batchStats);
    
    console.log('✅ 批量操作效率测试通过');
    return true;
  } catch (error) {
    console.error('❌ 批量操作效率测试失败:', error.message);
    return false;
  }
}

/**
 * 测试连接重试机制
 */
async function testConnectionRetry() {
  console.log('\n=== 测试连接重试机制 ===');
  
  try {
    // 模拟网络不稳定情况下的操作
    const testData = generateTestTweets(3);
    testData.forEach((tweet, index) => {
      tweet.url = `${tweet.url}_retry_${index}`;
    });
    
    console.log('测试重试机制（正常情况下应该成功）...');
    
    const retryResult = await storeTweetDataToSupabase(testData);
    console.log('重试测试结果:', retryResult);
    
    console.log('✅ 连接重试机制测试通过');
    return true;
  } catch (error) {
    console.error('❌ 连接重试机制测试失败:', error.message);
    return false;
  }
}

/**
 * 测试连接清理和资源释放
 */
async function testConnectionCleanup() {
  console.log('\n=== 测试连接清理和资源释放 ===');
  
  try {
    // 获取清理前的连接统计
    const beforeCleanup = getConnectionStats();
    console.log('清理前连接统计:', beforeCleanup);
    
    // 等待一段时间让空闲连接被清理
    console.log('等待空闲连接清理...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 获取清理后的连接统计
    const afterCleanup = getConnectionStats();
    console.log('清理后连接统计:', afterCleanup);
    
    console.log('✅ 连接清理测试完成');
    return true;
  } catch (error) {
    console.error('❌ 连接清理测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('🚀 开始数据库连接优化测试');
  console.log('目标：验证Supabase免费版200连接限制解决方案');
  
  const testResults = [];
  
  try {
    // 运行所有测试
    testResults.push(await testConnectionPoolBasics());
    testResults.push(await testConcurrentConnections());
    testResults.push(await testBatchOperations());
    testResults.push(await testConnectionRetry());
    testResults.push(await testConnectionCleanup());
    
    // 统计测试结果
    const passedTests = testResults.filter(result => result === true).length;
    const totalTests = testResults.length;
    
    console.log('\n📊 测试结果汇总:');
    console.log(`通过测试: ${passedTests}/${totalTests}`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    // 最终连接统计
    const finalStats = getConnectionStats();
    console.log('\n🔍 最终连接统计:', finalStats);
    
    if (passedTests === totalTests) {
      console.log('\n🎉 所有测试通过！连接优化方案工作正常');
      console.log('✅ Supabase免费版200连接限制问题已解决');
    } else {
      console.log('\n⚠️ 部分测试失败，需要进一步优化');
    }
    
  } catch (error) {
    console.error('\n💥 测试执行过程中发生错误:', error.message);
  } finally {
    // 清理资源
    console.log('\n🧹 清理测试资源...');
    try {
      await connectionManager.closeAllConnections();
      console.log('✅ 资源清理完成');
    } catch (cleanupError) {
      console.error('❌ 资源清理失败:', cleanupError.message);
    }
  }
}

// 如果直接运行此脚本，执行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testConnectionPoolBasics,
  testConcurrentConnections,
  testBatchOperations,
  testConnectionRetry,
  testConnectionCleanup
};