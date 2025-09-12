/**
 * 测试硅基流动平台DeepSeek API调用
 */

const { callDeepSeekAPI } = require('./generateAIReport.js');

async function testAPI() {
  try {
    console.log('测试DeepSeek API调用...');
    
    const testPrompt = '请用中文回答：什么是人工智能？请简短回答。';
    
    const response = await callDeepSeekAPI(testPrompt);
    
    console.log('\n=== API测试成功 ===');
    console.log('回复内容:', response);
    console.log('=== 测试结束 ===\n');
    
  } catch (error) {
    console.error('\n=== API测试失败 ===');
    console.error('错误信息:', error.message);
    
    if (error.message.includes('SILICONFLOW_API_KEY')) {
      console.log('\n📝 请按以下步骤配置API密钥:');
      console.log('1. 访问硅基流动平台官网注册账号');
      console.log('2. 获取API密钥');
      console.log('3. 在.env文件中设置 SILICONFLOW_API_KEY=你的密钥');
    }
    
    console.log('=== 测试结束 ===\n');
  }
}

testAPI();