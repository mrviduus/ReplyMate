// Mock OpenAI SDK before imports
jest.mock('openai', () => {
  return jest.fn().mockImplementation((config) => ({
    apiKey: config.apiKey,
    organization: config.organization,
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mocked OpenAI reply'
            }
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50
          }
        })
      }
    }
  }));
});

import { OpenAIProvider, OPENAI_MODELS } from '../../src/inference/providers/openai-provider';
import { ProviderError } from '../../src/inference/inference-provider';

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  const validApiKey = 'sk-proj-test-api-key-1234567890';
  const legacyApiKey = 'sk-test-api-key-1234567890';
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
      provider = new OpenAIProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });

    it('should initialize with legacy API key format', async () => {
      provider = new OpenAIProvider({ apiKey: legacyApiKey });
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });

    it('should fail initialization without API key', async () => {
      provider = new OpenAIProvider({});
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(provider.isReady()).toBe(false);
    });

    it('should fail initialization with invalid API key format', async () => {
      provider = new OpenAIProvider({ apiKey: invalidApiKey });
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(provider.isReady()).toBe(false);
    });

    it('should use default model if not specified', () => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
      expect(provider.getModelName()).toBe('gpt-4o-mini');
    });

    it('should allow custom model in config', () => {
      provider = new OpenAIProvider({
        apiKey: validApiKey,
        model: 'gpt-4o'
      });
      expect(provider.getModelName()).toBe('gpt-4o');
    });

    it('should support organization ID', async () => {
      const OpenAI = require('openai');
      provider = new OpenAIProvider({
        apiKey: validApiKey,
        organization: 'org-123'
      });
      await provider.initialize();

      expect(OpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: 'org-123'
        })
      );
    });

    it('should handle API verification errors', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              status: 401,
              message: 'invalid_api_key'
            })
          }
        }
      }));

      provider = new OpenAIProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
    });

    it('should ignore rate limit errors during verification', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({ status: 429 })
          }
        }
      }));

      provider = new OpenAIProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });
  });

  describe('Reply Generation', () => {
    beforeEach(async () => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
      await provider.initialize();
    });

    it('should generate reply using OpenAI API', async () => {
      const response = await provider.generateReply(
        'You are a helpful assistant',
        'Generate a LinkedIn reply'
      );

      expect(response).toHaveProperty('reply');
      expect(response.reply).toBe('Mocked OpenAI reply');
      expect(response.provider).toBe('openai');
      expect(response.model).toBe('gpt-4o-mini');
    });

    it('should fail if not initialized', async () => {
      const uninitializedProvider = new OpenAIProvider({ apiKey: validApiKey });

      await expect(
        uninitializedProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.NOT_INITIALIZED);
    });

    it('should pass system and user messages correctly', async () => {
      const OpenAI = require('openai');
      let capturedMessages: any[] = [];

      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation((params) => {
              capturedMessages = params.messages;
              return Promise.resolve({
                choices: [{ message: { content: 'Response' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 }
              });
            })
          }
        }
      }));

      const messageProvider = new OpenAIProvider({ apiKey: validApiKey });
      await messageProvider.initialize();
      await messageProvider.generateReply('System prompt', 'User prompt');

      expect(capturedMessages).toEqual([
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User prompt' }
      ]);
    });

    it('should include token usage information', async () => {
      const response = await provider.generateReply(
        'System prompt',
        'User prompt'
      );

      expect(response.tokensUsed).toBeDefined();
      expect(response.tokensUsed).toBe(150); // 100 prompt + 50 completion
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
      const OpenAI = require('openai');
      let callCount = 0;

      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              callCount++;
              if (callCount === 1) {
                // First call for verification succeeds
                return Promise.resolve({
                  choices: [{ message: { content: 'Hi' } }]
                });
              } else {
                // Second call for actual generation fails with rate limit
                return Promise.reject({
                  status: 429,
                  code: 'rate_limit_exceeded'
                });
              }
            })
          }
        }
      }));

      const rateLimitProvider = new OpenAIProvider({ apiKey: validApiKey });
      await rateLimitProvider.initialize();

      await expect(
        rateLimitProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.RATE_LIMIT);
    });

    it('should handle insufficient quota', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: 'Hi' } }] })
              .mockRejectedValue({ code: 'insufficient_quota' })
          }
        }
      }));

      const quotaProvider = new OpenAIProvider({ apiKey: validApiKey });
      await quotaProvider.initialize();

      await expect(
        quotaProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.RATE_LIMIT);
    });

    it('should handle network errors', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: 'Hi' } }] })
              .mockRejectedValue(new Error('Network error'))
          }
        }
      }));

      const errorProvider = new OpenAIProvider({ apiKey: validApiKey });
      await errorProvider.initialize();

      await expect(
        errorProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.NETWORK_ERROR);
    });

    it('should handle empty response', async () => {
      const OpenAI = require('openai');
      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn()
              .mockResolvedValueOnce({ choices: [{ message: { content: 'Hi' } }] })
              .mockResolvedValue({ choices: [] })
          }
        }
      }));

      const emptyProvider = new OpenAIProvider({ apiKey: validApiKey });
      await emptyProvider.initialize();

      const response = await emptyProvider.generateReply('system', 'user');
      expect(response.reply).toBe('');
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct OpenAI API key format', async () => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey(validApiKey)).toBe(true);
      expect(await provider.validateApiKey(legacyApiKey)).toBe(true);
    });

    it('should accept new project key format', async () => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey('sk-proj-long-key-with-many-characters')).toBe(true);
    });

    it('should reject invalid API key formats', async () => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey('pk-invalid')).toBe(false);
      expect(await provider.validateApiKey('not-an-api-key')).toBe(false);
      expect(await provider.validateApiKey('')).toBe(false);
      expect(await provider.validateApiKey('short')).toBe(false);
    });
  });

  describe('Provider Information', () => {
    beforeEach(() => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
    });

    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('OpenAI API');
    });

    it('should return correct provider type', () => {
      expect(provider.getProviderType()).toBe('openai');
    });

    it('should return model name', () => {
      const modelName = provider.getModelName();
      expect(modelName).toBeTruthy();
      expect(modelName).toContain('gpt');
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(() => {
      provider = new OpenAIProvider({ apiKey: validApiKey });
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
      const OpenAI = require('openai');
      let capturedParams: any;

      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation((params) => {
              capturedParams = params;
              return Promise.resolve({
                choices: [{ message: { content: 'Response' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 }
              });
            })
          }
        }
      }));

      provider = new OpenAIProvider({
        apiKey: validApiKey,
        maxTokens: 200
      });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedParams.max_tokens).toBe(200);
    });

    it('should respect temperature configuration', async () => {
      const OpenAI = require('openai');
      let capturedParams: any;

      OpenAI.mockImplementationOnce(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation((params) => {
              capturedParams = params;
              return Promise.resolve({
                choices: [{ message: { content: 'Response' } }],
                usage: { prompt_tokens: 10, completion_tokens: 5 }
              });
            })
          }
        }
      }));

      provider = new OpenAIProvider({
        apiKey: validApiKey,
        temperature: 0.5
      });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedParams.temperature).toBe(0.5);
    });
  });

  describe('Available Models', () => {
    it('should support all defined models', () => {
      const models = Object.values(OPENAI_MODELS);

      for (const model of models) {
        const modelProvider = new OpenAIProvider({
          apiKey: validApiKey,
          model
        });
        expect(modelProvider.getModelName()).toBe(model);
      }
    });

    it('should have proper model constants', () => {
      expect(OPENAI_MODELS.GPT_4O).toBe('gpt-4o');
      expect(OPENAI_MODELS.GPT_4O_MINI).toBe('gpt-4o-mini');
      expect(OPENAI_MODELS.GPT_4_TURBO).toBe('gpt-4-turbo');
      expect(OPENAI_MODELS.GPT_4).toBe('gpt-4');
      expect(OPENAI_MODELS.GPT_35_TURBO).toBe('gpt-3.5-turbo');
    });
  });

  describe('Error Codes', () => {
    it('should use proper error codes for different failures', async () => {
      const testCases = [
        { status: 429, expectedError: ProviderError.RATE_LIMIT },
        { status: 401, expectedError: ProviderError.INVALID_KEY },
        { status: 503, expectedError: ProviderError.PROVIDER_DOWN },
        { status: 400, expectedError: ProviderError.INVALID_RESPONSE },
        { code: 'insufficient_quota', expectedError: ProviderError.RATE_LIMIT },
        { code: 'invalid_api_key', expectedError: ProviderError.INVALID_KEY },
        { code: 'invalid_request_error', expectedError: ProviderError.INVALID_RESPONSE }
      ];

      for (const testCase of testCases) {
        const OpenAI = require('openai');
        OpenAI.mockImplementationOnce(() => ({
          chat: {
            completions: {
              create: jest.fn()
                .mockResolvedValueOnce({ choices: [{ message: { content: 'Hi' } }] })
                .mockRejectedValue(testCase)
            }
          }
        }));

        const errorProvider = new OpenAIProvider({ apiKey: validApiKey });
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