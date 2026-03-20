const { AIContentService } = require('../core/services/aiService');

describe('AIContentService live API test', () => {
  test('should print live AI response from OpenRouter', async () => {
    if (process.env.RUN_LIVE_AI_TEST !== 'true') {
      console.log('跳过实时AI测试：设置 RUN_LIVE_AI_TEST=true 可启用');
      return;
    }

    const service = new AIContentService();
    const result = await service.generateContent(
      '请只回复一句话：`LIVE_OK`，不要添加其他内容。',
      {
        temperature: 0,
        maxTokens: 32
      }
    );

    console.log('LIVE_AI_RESPONSE:', result.content);
    expect(typeof result.content).toBe('string');
    expect(result.content.trim().length).toBeGreaterThan(0);
  }, 120000);
});
