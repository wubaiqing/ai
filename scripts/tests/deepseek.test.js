/**
 * DeepSeek AI 服务测试
 * 用于验证 DeepSeek V4 Flash 集成
 */

require('dotenv').config();
const { aiContentService } = require('../core/services/aiService');

async function testDeepSeekIntegration() {
  console.log('=== DeepSeek V4 Flash 集成测试 ===\n');

  try {
    // 1. 验证配置
    console.log('1. 验证配置...');
    const configValidation = aiContentService.validateConfiguration();
    console.log('配置验证结果:', configValidation);

    if (!configValidation.isValid) {
      console.error('配置无效，请检查环境变量');
      return;
    }

    // 2. 测试简单对话
    console.log('\n2. 测试简单对话...');
    const simpleResult = await aiContentService.generateContent(
      '用一句话介绍 DeepSeek V4 Flash 模型'
    );
    console.log('AI 响应:', simpleResult.content);

    // 3. 测试带 system prompt 的对话
    console.log('\n3. 测试带 system prompt 的对话...');
    const systemResult = await aiContentService.generateContent(
      '今天天气怎么样？',
      { systemPrompt: '你是一个简洁的助手，回答不超过20字' }
    );
    console.log('AI 响应:', systemResult.content);

    // 4. 测试推文分析场景
    console.log('\n4. 测试推文分析场景...');
    const mockTweets = [
      {
        content: 'OpenAI 发布了新的 GPT 模型，性能大幅提升',
        url: 'https://twitter.com/example/1',
        published_date: '2026-08-30'
      },
      {
        content: 'DeepSeek 推出 V4 Flash，价格更便宜，速度更快',
        url: 'https://twitter.com/example/2',
        published_date: '2026-08-31'
      }
    ];

    const reportResult = await aiContentService.analyzeTweetsAndGenerateReport(mockTweets);
    console.log('生成的简报:\n', reportResult.content);
    console.log('\n使用模型:', reportResult.model);

    console.log('\n=== 测试完成 ===');
  } catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
  }
}

testDeepSeekIntegration();

