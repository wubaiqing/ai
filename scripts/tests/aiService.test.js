jest.mock('axios', () => ({
  create: jest.fn()
}));

const axios = require('axios');
const { AIContentService } = require('../core/services/aiService');
const { applicationConfig } = require('../core/reports/config');

describe('AIContentService OpenRouter configuration', () => {
  const originalAIConfig = { ...applicationConfig.aiService };
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    applicationConfig.aiService = { ...originalAIConfig };
  });

  afterAll(() => {
    process.env = originalEnv;
    applicationConfig.aiService = originalAIConfig;
  });

  test('initializeService should configure auth headers', () => {
    const mockClient = { post: jest.fn() };
    axios.create.mockReturnValue(mockClient);

    applicationConfig.aiService.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    applicationConfig.aiService.apiKey = 'sk-or-v1-test-key';
    applicationConfig.aiService.requestTimeout = 12345;

    const service = new AIContentService();
    service.initializeService();

    expect(axios.create).toHaveBeenCalledTimes(1);
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      baseURL: 'https://openrouter.ai/api/v1/chat/completions',
      timeout: 12345,
      headers: expect.objectContaining({
        Authorization: 'Bearer sk-or-v1-test-key',
        'Content-Type': 'application/json'
      })
    }));
  });

  test('buildRequestPayload should use configured model by default', () => {
    applicationConfig.aiService.modelName = 'openai/gpt-4o-mini';
    applicationConfig.aiService.maxTokens = 4096;
    applicationConfig.aiService.temperature = 0.7;

    const service = new AIContentService();
    const payload = service.buildRequestPayload('hello world', {});

    expect(payload.model).toBe('openai/gpt-4o-mini');
    expect(payload.messages).toEqual([
      { role: 'user', content: 'hello world' }
    ]);
    expect(payload.max_tokens).toBe(4096);
    expect(payload.temperature).toBe(0.7);
  });

  test('shouldUseProxy should return true when proxy env is set', () => {
    process.env.PROXY_HOST = '127.0.0.1';
    process.env.PROXY_PORT = '7890';
    const service = new AIContentService();

    expect(service.shouldUseProxy('https://openrouter.ai/api/v1/chat/completions')).toBe(true);
    expect(service.shouldUseProxy('https://api.openrouter.ai/v1/models')).toBe(true);
    expect(service.shouldUseProxy('https://example.com')).toBe(true);
  });

  test('makeAPIRequest should send payload to configured client', async () => {
    const payload = {
      model: 'openai/gpt-4o-mini',
      messages: [{ role: 'user', content: 'ping' }]
    };
    const apiResponse = { choices: [{ message: { content: 'pong' } }] };
    const mockPost = jest.fn().mockResolvedValue({ data: apiResponse });
    const mockClient = { post: mockPost };
    axios.create.mockReturnValue(mockClient);

    applicationConfig.aiService.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    applicationConfig.aiService.apiKey = 'sk-or-v1-test-key';

    const service = new AIContentService();
    service.initializeService();

    const result = await service.makeAPIRequest(payload);

    expect(mockPost).toHaveBeenCalledWith('', payload);
    expect(result).toEqual(apiResponse);
  });
});
