// Mock Anthropic SDK before imports
jest.mock('@anthropic-ai/sdk', () => {
  return {
    default: jest.fn().mockImplementation((config) => ({
      apiKey: config.apiKey,
      messages: {
        create: jest.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: 'Mocked Claude reply'
          }],
          usage: {
            input_tokens: 100,
            output_tokens: 50
          }
        })
      }
    }))
  };
});

import { ClaudeProvider } from '../../src/inference/providers/claude-provider';
import { ProviderError } from '../../src/inference/inference-provider';

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;
  const validApiKey = 'sk-ant-api03-test-key-1234567890';
  const invalidApiKey = 'invalid-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (provider) {
      await provider.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize with valid API key', async () => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });

    it('should fail initialization without API key', async () => {
      provider = new ClaudeProvider({});
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(provider.isReady()).toBe(false);
    });

    it('should fail initialization with invalid API key format', async () => {
      provider = new ClaudeProvider({ apiKey: invalidApiKey });
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(provider.isReady()).toBe(false);
    });

    it('should use default model if not specified', () => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
      expect(provider.getModelName()).toBe('claude-3-5-sonnet-20241022');
    });

    it('should allow custom model in config', () => {
      provider = new ClaudeProvider({
        apiKey: validApiKey,
        model: 'claude-3-opus-20240229'
      });
      expect(provider.getModelName()).toBe('claude-3-opus-20240229');
    });

    it('should handle API verification errors', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      Anthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockRejectedValue({ status: 401, message: 'Invalid API key' })
        }
      }));

      provider = new ClaudeProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).rejects.toThrow('Invalid API key');
    });
  });

  describe('Reply Generation', () => {
    beforeEach(async () => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
      await provider.initialize();
    });

    it('should generate reply using Claude API', async () => {
      const response = await provider.generateReply(
        'You are a helpful assistant',
        'Generate a LinkedIn reply'
      );

      expect(response).toHaveProperty('reply');
      expect(response.reply).toBe('Mocked Claude reply');
      expect(response.provider).toBe('claude');
      expect(response.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should fail if not initialized', async () => {
      const uninitializedProvider = new ClaudeProvider({ apiKey: validApiKey });

      await expect(
        uninitializedProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.NOT_INITIALIZED);
    });

    it('should include token usage information', async () => {
      const response = await provider.generateReply(
        'System prompt',
        'User prompt'
      );

      expect(response.tokensUsed).toBeDefined();
      expect(response.tokensUsed).toBe(150); // 100 input + 50 output
    });

    it('should include latency information', async () => {
      const response = await provider.generateReply(
        'System prompt',
        'User prompt'
      );

      expect(response.latency).toBeDefined();
      expect(typeof response.latency).toBe('number');
      expect(response.latency).toBeGreaterThanOrEqual(0);
    });

    it('should handle rate limiting', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      const mockCreate = jest.fn()
        .mockRejectedValueOnce({ status: 429, message: 'Rate limit exceeded' })
        .mockResolvedValueOnce({
          content: [{ type: 'text', text: 'Retry successful' }],
          usage: { input_tokens: 10, output_tokens: 5 }
        });

      Anthropic.mockImplementationOnce(() => ({
        messages: { create: mockCreate }
      }));

      const rateLimitProvider = new ClaudeProvider({ apiKey: validApiKey });
      await rateLimitProvider.initialize();

      await expect(
        rateLimitProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.RATE_LIMIT);
    });

    it('should handle network errors', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      Anthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockRejectedValue(new Error('Network error'))
        }
      }));

      const errorProvider = new ClaudeProvider({ apiKey: validApiKey });
      await errorProvider.initialize();

      await expect(
        errorProvider.generateReply('system', 'user')
      ).rejects.toThrow('Network error');
    });

    it('should handle unexpected response format', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      Anthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockResolvedValue({
            content: [{ type: 'image', source: 'not-text' }]
          })
        }
      }));

      const badResponseProvider = new ClaudeProvider({ apiKey: validApiKey });
      await badResponseProvider.initialize();

      await expect(
        badResponseProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.INVALID_RESPONSE);
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct Claude API key format', async () => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey(validApiKey)).toBe(true);
    });

    it('should reject invalid API key format', async () => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey('sk-invalid')).toBe(false);
      expect(await provider.validateApiKey('not-an-api-key')).toBe(false);
      expect(await provider.validateApiKey('')).toBe(false);
    });

    it('should accept different Claude key formats', async () => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey('sk-ant-api03-test')).toBe(true);
      expect(await provider.validateApiKey('sk-ant-test-key')).toBe(true);
    });
  });

  describe('Provider Information', () => {
    beforeEach(() => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
    });

    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('Claude API');
    });

    it('should return correct provider type', () => {
      expect(provider.getProviderType()).toBe('claude');
    });

    it('should return model name', () => {
      const modelName = provider.getModelName();
      expect(modelName).toBeTruthy();
      expect(modelName).toContain('claude');
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(() => {
      provider = new ClaudeProvider({ apiKey: validApiKey });
    });

    it('should properly dispose resources', async () => {
      await provider.initialize();
      expect(provider.isReady()).toBe(true);

      await provider.dispose();
      expect(provider.isReady()).toBe(false);
    });

    it('should handle multiple dispose calls', async () => {
      await provider.initialize();

      await expect(provider.dispose()).resolves.not.toThrow();
      await expect(provider.dispose()).resolves.not.toThrow();
    });

    it('should require re-initialization after dispose', async () => {
      await provider.initialize();
      await provider.dispose();

      await expect(
        provider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.NOT_INITIALIZED);
    });
  });

  describe('Configuration', () => {
    it('should respect maxTokens configuration', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      let capturedParams: any;

      Anthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockImplementation((params) => {
            capturedParams = params;
            return Promise.resolve({
              content: [{ type: 'text', text: 'Response' }],
              usage: { input_tokens: 10, output_tokens: 5 }
            });
          })
        }
      }));

      provider = new ClaudeProvider({
        apiKey: validApiKey,
        maxTokens: 200
      });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedParams.max_tokens).toBe(200);
    });

    it('should respect temperature configuration', async () => {
      const Anthropic = require('@anthropic-ai/sdk').default;
      let capturedParams: any;

      Anthropic.mockImplementationOnce(() => ({
        messages: {
          create: jest.fn().mockImplementation((params) => {
            capturedParams = params;
            return Promise.resolve({
              content: [{ type: 'text', text: 'Response' }],
              usage: { input_tokens: 10, output_tokens: 5 }
            });
          })
        }
      }));

      provider = new ClaudeProvider({
        apiKey: validApiKey,
        temperature: 0.5
      });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedParams.temperature).toBe(0.5);
    });
  });

  describe('Error Codes', () => {
    it('should use proper error codes for different failures', async () => {
      const testCases = [
        { status: 429, expectedError: ProviderError.RATE_LIMIT },
        { status: 401, expectedError: ProviderError.INVALID_KEY },
        { status: 503, expectedError: ProviderError.PROVIDER_DOWN },
        { status: 400, expectedError: ProviderError.INVALID_RESPONSE }
      ];

      for (const testCase of testCases) {
        const Anthropic = require('@anthropic-ai/sdk').default;
        Anthropic.mockImplementationOnce(() => ({
          messages: {
            create: jest.fn().mockRejectedValue({
              status: testCase.status,
              message: 'Error'
            })
          }
        }));

        const errorProvider = new ClaudeProvider({ apiKey: validApiKey });
        await errorProvider.initialize();

        try {
          await errorProvider.generateReply('system', 'user');
          fail('Should have thrown an error');
        } catch (error) {
          expect((error as Error).message).toContain(testCase.expectedError);
        }
      }
    });
  });
});