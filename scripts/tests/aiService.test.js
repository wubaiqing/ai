jest.mock('@cozeloop/ai', () => {
  const invoke = jest.fn();
  const ApiClient = jest.fn().mockImplementation(options => ({ options }));
  const PromptAsAService = jest.fn().mockImplementation(options => ({
    options,
    invoke
  }));

  return {
    ApiClient,
    PromptAsAService,
    __mockInvoke: invoke
  };
});

const cozeloop = require('@cozeloop/ai');
const { AIContentService } = require('../core/services/aiService');
const { applicationConfig } = require('../core/reports/config');

describe('AIContentService CozeLoop integration', () => {
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

  test('initializeService should configure CozeLoop prompt service', () => {
    applicationConfig.aiService.cozeBaseUrl = 'https://api.coze.cn';
    applicationConfig.aiService.cozeToken = 'pat_test_token';
    applicationConfig.aiService.cozeWorkspaceId = 'workspace_123';
    applicationConfig.aiService.cozePromptKey = 'daily_report';
    applicationConfig.aiService.cozePromptVersion = '0.0.1';
    applicationConfig.aiService.requestTimeout = 23456;

    const service = new AIContentService();
    service.initializeService();

    expect(cozeloop.ApiClient).toHaveBeenCalledWith(expect.objectContaining({
      token: 'pat_test_token',
      baseURL: 'https://api.coze.cn',
      axiosOptions: expect.objectContaining({
        timeout: 23456
      })
    }));
    expect(cozeloop.PromptAsAService).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace_123',
      prompt: {
        prompt_key: 'daily_report',
        version: '0.0.1'
      }
    }));
  });

  test('buildRequestPayload should build CozeLoop messages and variables', () => {
    const service = new AIContentService();
    const payload = service.buildRequestPayload('user prompt', {
      systemPrompt: 'system prompt',
      variables: {
        topic: 'artificial intelligence'
      }
    });

    expect(payload).toEqual({
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'user prompt' }
      ],
      variables: {
        topic: 'artificial intelligence'
      }
    });
  });

  test('initializeService should ignore proxy env for CozeLoop requests', () => {
    process.env.PROXY_HOST = '127.0.0.1';
    process.env.PROXY_PORT = '7890';
    process.env.PROXY_USERNAME = 'user';
    process.env.PROXY_PASSWORD = 'pass';
    applicationConfig.aiService.cozeBaseUrl = 'https://api.coze.cn';
    applicationConfig.aiService.cozeToken = 'pat_test_token';
    applicationConfig.aiService.cozeWorkspaceId = 'workspace_123';
    applicationConfig.aiService.cozePromptKey = 'daily_report';
    const service = new AIContentService();

    service.initializeService();

    expect(cozeloop.ApiClient).toHaveBeenCalledWith(expect.objectContaining({
      token: 'pat_test_token',
      baseURL: 'https://api.coze.cn',
      axiosOptions: {
        timeout: applicationConfig.aiService.requestTimeout
      }
    }));
  });

  test('makeAPIRequest should invoke CozeLoop prompt service', async () => {
    const payload = {
      messages: [{ role: 'user', content: 'ping' }],
      variables: { topic: 'AI' }
    };
    cozeloop.__mockInvoke.mockResolvedValue({
      message: {
        role: 'assistant',
        content: 'pong'
      }
    });

    applicationConfig.aiService.cozeToken = 'pat_test_token';
    applicationConfig.aiService.cozeWorkspaceId = 'workspace_123';
    applicationConfig.aiService.cozePromptKey = 'daily_report';

    const service = new AIContentService();
    service.initializeService();

    const result = await service.makeAPIRequest(payload);

    expect(cozeloop.__mockInvoke).toHaveBeenCalledWith(payload);
    expect(result).toEqual({
      message: {
        role: 'assistant',
        content: 'pong'
      }
    });
  });

  test('extractContentFromResponse should read content from message', () => {
    const service = new AIContentService();

    expect(service.extractContentFromResponse({
      message: {
        role: 'assistant',
        content: '  hello world  '
      }
    })).toBe('hello world');
  });
});
