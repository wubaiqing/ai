/**
 * AI简报生成脚本完整测试
 */

const { AIReportGenerator } = require('./lib/reportGenerator.js');
const { TweetDataService } = require('./lib/tweetService.js');
const { AIContentService } = require('./lib/aiService.js');
const { FileOperationService } = require('./lib/fileService.js');
const fs = require('fs').promises;
const path = require('path');

/**
 * 测试日志函数
 */
function testLog(message, status = 'INFO') {
  const timestamp = new Date().toISOString();
  const statusIcon = {
    'INFO': '📋',
    'SUCCESS': '✅',
    'ERROR': '❌',
    'WARN': '⚠️'
  };
  console.log(`${statusIcon[status]} [${timestamp}] ${message}`);
}

/**
 * 测试数据库连接和查询
 */
async function testDatabaseConnection() {
  testLog('测试数据库连接和查询功能...');
  
  try {
    const tweetService = new TweetDataService();
    const tweets = await tweetService.getTodayTweets();
    testLog(`数据库查询成功，获取到 ${tweets.length} 条推文数据`, 'SUCCESS');
    
    if (tweets.length > 0) {
      testLog(`示例推文: ${tweets[0].content.substring(0, 50)}...`);
    }
    
    return { success: true, count: tweets.length, data: tweets };
  } catch (error) {
    testLog(`数据库查询失败: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

/**
 * 测试API连接
 */
async function testAPIConnection() {
  testLog('测试DeepSeek API连接...');
  
  try {
    const aiService = new AIContentService();
    const testTweets = [{ 
      content: '请用中文简短回答：什么是人工智能？',
      url: 'https://example.com/test',
      published_date: '2024-01-01'
    }];
    const response = await aiService.analyzeTweetsAndGenerateReport(testTweets);
    
    testLog('API连接成功', 'SUCCESS');
    testLog(`API响应: ${response.substring(0, 100)}...`);
    
    return { success: true, response };
  } catch (error) {
    testLog(`API连接失败: ${error.message}`, 'ERROR');
    
    if (error.message.includes('SILICONFLOW_API_KEY')) {
      testLog('请在.env文件中配置SILICONFLOW_API_KEY', 'WARN');
    }
    
    return { success: false, error: error.message };
  }
}

/**
 * 测试完整的简报生成流程
 */
async function testFullReportGeneration() {
  testLog('测试完整简报生成流程...');
  
  try {
    const reportGenerator = new AIReportGenerator();
    const result = await reportGenerator.generateCompleteReport();
    
    if (result && result.success) {
      testLog(`简报生成成功！文件路径: ${result.reportPath}`, 'SUCCESS');
      testLog(`处理推文数量: ${result.tweetsCount}`);
      
      // 检查文件是否存在
      try {
        await fs.access(result.reportPath);
        testLog('简报文件创建成功', 'SUCCESS');
        
        // 读取文件内容
        const content = await fs.readFile(result.reportPath, 'utf8');
        testLog(`文件大小: ${content.length} 字符`);
        
      } catch (fileError) {
        testLog(`简报文件检查失败: ${fileError.message}`, 'ERROR');
      }
      
      return { success: true, result };
    } else {
      testLog('简报生成失败', 'ERROR');
      return { success: false };
    }
  } catch (error) {
    testLog(`简报生成异常: ${error.message}`, 'ERROR');
    return { success: false, error: error.message };
  }
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  testLog('测试错误处理机制...');
  
  // 测试无效API密钥
  const originalKey = process.env.SILICONFLOW_API_KEY;
  process.env.SILICONFLOW_API_KEY = 'invalid_key';
  
  try {
    const aiService = new AIContentService();
    const testTweets = [{ 
      content: '测试',
      url: 'https://example.com/test',
      published_date: '2024-01-01'
    }];
    await aiService.analyzeTweetsAndGenerateReport(testTweets);
    testLog('错误处理测试失败：应该抛出异常', 'ERROR');
  } catch (error) {
    testLog('错误处理测试成功：正确捕获API错误', 'SUCCESS');
  }
  
  // 恢复原始密钥
  process.env.SILICONFLOW_API_KEY = originalKey;
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 AI简报生成脚本 - 完整功能测试');
  console.log('='.repeat(60) + '\n');
  
  const testResults = {
    database: null,
    api: null,
    fullGeneration: null,
    errorHandling: null
  };
  
  // 1. 测试数据库连接
  testResults.database = await testDatabaseConnection();
  console.log();
  
  // 2. 测试API连接
  testResults.api = await testAPIConnection();
  console.log();
  
  // 3. 测试错误处理
  await testErrorHandling();
  console.log();
  
  // 4. 如果前面的测试都通过，测试完整流程
  if (testResults.database.success && testResults.api.success) {
    testResults.fullGeneration = await testFullReportGeneration();
  } else {
    testLog('跳过完整流程测试（前置条件未满足）', 'WARN');
  }
  
  // 输出测试总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果总结');
  console.log('='.repeat(60));
  
  console.log(`数据库连接: ${testResults.database.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`API连接: ${testResults.api.success ? '✅ 通过' : '❌ 失败'}`);
  console.log(`完整流程: ${testResults.fullGeneration ? (testResults.fullGeneration.success ? '✅ 通过' : '❌ 失败') : '⏭️ 跳过'}`);
  
  if (testResults.database.success && testResults.api.success) {
    console.log('\n🎉 所有核心功能测试通过！脚本可以正常使用。');
    console.log('\n📝 使用方法:');
    console.log('   node generateAIReport.js');
  } else {
    console.log('\n⚠️ 部分功能测试失败，请检查配置：');
    if (!testResults.database.success) {
      console.log('   - 检查数据库连接配置');
    }
    if (!testResults.api.success) {
      console.log('   - 检查SILICONFLOW_API_KEY配置');
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  return testResults;
}

// 运行测试
if (require.main === module) {
  runAllTests()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试运行异常:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testDatabaseConnection,
  testAPIConnection,
  testFullReportGeneration
};