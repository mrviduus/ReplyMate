// Mock Google Generative AI SDK before imports
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation((apiKey) => ({
      apiKey,
      getGenerativeModel: jest.fn().mockImplementation(({ model }) => ({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: jest.fn().mockReturnValue('Mocked Gemini reply')
          }
        })
      }))
    }))
  };
});

import { GeminiProvider } from '../../src/inference/providers/gemini-provider';
import { ProviderError } from '../../src/inference/inference-provider';

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  const validApiKey = 'AIzaSyC-test-api-key-1234567890';
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
      provider = new GeminiProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });

    it('should fail initialization without API key', async () => {
      provider = new GeminiProvider({});
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(provider.isReady()).toBe(false);
    });

    it('should fail initialization with invalid API key format', async () => {
      provider = new GeminiProvider({ apiKey: invalidApiKey });
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(provider.isReady()).toBe(false);
    });

    it('should use default model if not specified', () => {
      provider = new GeminiProvider({ apiKey: validApiKey });
      expect(provider.getModelName()).toBe('gemini-1.5-flash');
    });

    it('should allow custom model in config', () => {
      provider = new GeminiProvider({
        apiKey: validApiKey,
        model: 'gemini-1.5-pro'
      });
      expect(provider.getModelName()).toBe('gemini-1.5-pro');
    });

    it('should handle API verification errors', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn().mockRejectedValue({
            message: 'API_KEY_INVALID: Invalid API key'
          })
        }))
      }));

      provider = new GeminiProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
    });

    it('should ignore non-auth errors during verification', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn().mockRejectedValue({
            message: 'Network error'
          })
        }))
      }));

      provider = new GeminiProvider({ apiKey: validApiKey });
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });
  });

  describe('Reply Generation', () => {
    beforeEach(async () => {
      provider = new GeminiProvider({ apiKey: validApiKey });
      await provider.initialize();
    });

    it('should generate reply using Gemini API', async () => {
      const response = await provider.generateReply(
        'You are a helpful assistant',
        'Generate a LinkedIn reply'
      );

      expect(response).toHaveProperty('reply');
      expect(response.reply).toBe('Mocked Gemini reply');
      expect(response.provider).toBe('gemini');
      expect(response.model).toBe('gemini-1.5-flash');
    });

    it('should fail if not initialized', async () => {
      const uninitializedProvider = new GeminiProvider({ apiKey: validApiKey });

      await expect(
        uninitializedProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.NOT_INITIALIZED);
    });

    it('should combine system and user prompts', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      let capturedPrompt: string = '';

      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn().mockImplementation((prompt) => {
            capturedPrompt = prompt;
            return Promise.resolve({
              response: {
                text: jest.fn().mockReturnValue('Response')
              }
            });
          })
        }))
      }));

      const promptProvider = new GeminiProvider({ apiKey: validApiKey });
      await promptProvider.initialize();
      await promptProvider.generateReply('System prompt', 'User prompt');

      expect(capturedPrompt).toBe('System prompt\n\nUser prompt');
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
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      let modelCallCount = 0;

      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation(() => {
          modelCallCount++;
          if (modelCallCount === 1) {
            // First getGenerativeModel call for verification
            return {
              generateContent: jest.fn().mockResolvedValue({
                response: {
                  text: jest.fn().mockReturnValue('Hi')
                }
              })
            };
          } else {
            // Second getGenerativeModel call for actual generation
            return {
              generateContent: jest.fn().mockRejectedValue({
                message: 'Quota exceeded'
              })
            };
          }
        })
      }));

      const rateLimitProvider = new GeminiProvider({ apiKey: validApiKey });
      await rateLimitProvider.initialize();

      await expect(
        rateLimitProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.RATE_LIMIT);
    });

    it('should handle service unavailability', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation(() => ({
          generateContent: jest.fn().mockRejectedValue({
            message: 'Service unavailable'
          })
        }))
      }));

      const errorProvider = new GeminiProvider({ apiKey: validApiKey });
      await errorProvider.initialize();

      await expect(
        errorProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.PROVIDER_DOWN);
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct Gemini API key format', async () => {
      provider = new GeminiProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey(validApiKey)).toBe(true);
    });

    it('should accept alternative Gemini key formats', async () => {
      provider = new GeminiProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey('AIzaTestKey123456789012345678901234567890')).toBe(true);
    });

    it('should reject invalid API key formats', async () => {
      provider = new GeminiProvider({ apiKey: validApiKey });
      expect(await provider.validateApiKey('sk-invalid')).toBe(false);
      expect(await provider.validateApiKey('not-an-api-key')).toBe(false);
      expect(await provider.validateApiKey('')).toBe(false);
      expect(await provider.validateApiKey('short')).toBe(false);
    });

    it('should accept long keys even without AIza prefix', async () => {
      provider = new GeminiProvider({ apiKey: validApiKey });
      const longKey = 'x'.repeat(40);
      expect(await provider.validateApiKey(longKey)).toBe(true);
    });
  });

  describe('Provider Information', () => {
    beforeEach(() => {
      provider = new GeminiProvider({ apiKey: validApiKey });
    });

    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('Gemini API');
    });

    it('should return correct provider type', () => {
      expect(provider.getProviderType()).toBe('gemini');
    });

    it('should return model name', () => {
      const modelName = provider.getModelName();
      expect(modelName).toBeTruthy();
      expect(modelName).toContain('gemini');
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(() => {
      provider = new GeminiProvider({ apiKey: validApiKey });
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
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      let capturedConfig: any;

      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation((config) => {
          capturedConfig = config;
          return {
            generateContent: jest.fn().mockResolvedValue({
              response: {
                text: jest.fn().mockReturnValue('Response')
              }
            })
          };
        })
      }));

      provider = new GeminiProvider({
        apiKey: validApiKey,
        maxTokens: 200
      });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedConfig.generationConfig.maxOutputTokens).toBe(200);
    });

    it('should respect temperature configuration', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      let capturedConfig: any;

      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation((config) => {
          capturedConfig = config;
          return {
            generateContent: jest.fn().mockResolvedValue({
              response: {
                text: jest.fn().mockReturnValue('Response')
              }
            })
          };
        })
      }));

      provider = new GeminiProvider({
        apiKey: validApiKey,
        temperature: 0.5
      });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedConfig.generationConfig.temperature).toBe(0.5);
    });

    it('should set topP configuration', async () => {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      let capturedConfig: any;

      GoogleGenerativeAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockImplementation((config) => {
          capturedConfig = config;
          return {
            generateContent: jest.fn().mockResolvedValue({
              response: {
                text: jest.fn().mockReturnValue('Response')
              }
            })
          };
        })
      }));

      provider = new GeminiProvider({ apiKey: validApiKey });
      await provider.initialize();
      await provider.generateReply('system', 'user');

      expect(capturedConfig.generationConfig.topP).toBe(0.9);
    });
  });

  describe('Available Models', () => {
    it('should support Gemini 1.5 Flash', () => {
      provider = new GeminiProvider({
        apiKey: validApiKey,
        model: 'gemini-1.5-flash'
      });
      expect(provider.getModelName()).toBe('gemini-1.5-flash');
    });

    it('should support Gemini 1.5 Pro', () => {
      provider = new GeminiProvider({
        apiKey: validApiKey,
        model: 'gemini-1.5-pro'
      });
      expect(provider.getModelName()).toBe('gemini-1.5-pro');
    });

    it('should support Gemini Pro', () => {
      provider = new GeminiProvider({
        apiKey: validApiKey,
        model: 'gemini-pro'
      });
      expect(provider.getModelName()).toBe('gemini-pro');
    });
  });
});