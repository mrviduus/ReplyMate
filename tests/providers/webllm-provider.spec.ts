// Mock the model loader module BEFORE imports
jest.mock('../../src/model-loader', () => {
  // Create mock inside the factory function
  class MockOptimizedModelLoader {
    static instance: any = null;

    static getInstance() {
      if (!this.instance) {
        this.instance = new MockOptimizedModelLoader();
      }
      return this.instance;
    }

    async loadModel(modelId: string, progressCallback?: any, config?: any) {
      if (progressCallback) {
        progressCallback({
          progress: 0.5,
          progressText: 'Loading model...',
          isLoading: true,
          error: null,
          attemptNumber: 1
        });
      }

      return {
        chat: {
          completions: {
            create: jest.fn().mockImplementation(async function* (params: any) {
              yield {
                choices: [{
                  delta: { content: 'Mocked ' }
                }]
              };
              yield {
                choices: [{
                  delta: { content: 'reply' }
                }]
              };
            })
          }
        }
      };
    }
  }

  return {
    default: MockOptimizedModelLoader,
    ModelLoadingState: {},
    OptimizedModelLoader: MockOptimizedModelLoader
  };
});

// Mock the WebLLM dependencies
jest.mock('@mlc-ai/web-llm', () => ({
  MLCEngine: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            delta: { content: 'Test reply' }
          }]
        })
      }
    },
    reload: jest.fn().mockResolvedValue(undefined),
    unload: jest.fn().mockResolvedValue(undefined)
  })),
  ChatCompletionMessageParam: {}
}));

// Now we can import
import { WebLLMProvider } from '../../src/inference/providers/webllm-provider';
import { ProviderError } from '../../src/inference/inference-provider';

describe('WebLLMProvider', () => {
  let provider: WebLLMProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new WebLLMProvider();
  });

  afterEach(async () => {
    if (provider) {
      await provider.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize without API key', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });

    it('should use default model if not specified', () => {
      const modelName = provider.getModelName();
      expect(modelName).toBeTruthy();
      expect(modelName).toContain('Llama');
    });

    it('should allow custom model in config', () => {
      const customProvider = new WebLLMProvider({
        model: 'gemma-2-2b-it-q4f16_1-MLC'
      });
      expect(customProvider.getModelName()).toBe('gemma-2-2b-it-q4f16_1-MLC');
    });

    it('should handle initialization errors gracefully', async () => {
      // Override loadModel to throw error
      const MockLoader = require('../../src/model-loader').default;
      MockLoader.getInstance = jest.fn().mockReturnValue({
        loadModel: jest.fn().mockRejectedValue(new Error('Failed to load model'))
      });

      const failingProvider = new WebLLMProvider();
      await expect(failingProvider.initialize()).rejects.toThrow('Failed to load any WebLLM model');
      expect(failingProvider.isReady()).toBe(false);
    });
  });

  describe('Reply Generation', () => {
    beforeEach(async () => {
      await provider.initialize();
    });

    it('should generate reply with streaming', async () => {
      const response = await provider.generateReply(
        'You are a helpful assistant',
        'Generate a LinkedIn reply'
      );

      expect(response).toHaveProperty('reply');
      expect(response.reply).toBe('Mocked reply.');
      expect(response.provider).toBe('local');
      expect(response.model).toContain('Llama');
    });

    it('should fail if not initialized', async () => {
      const uninitializedProvider = new WebLLMProvider();

      await expect(
        uninitializedProvider.generateReply('system', 'user')
      ).rejects.toThrow(ProviderError.NOT_INITIALIZED);
    });

    it('should include timing information', async () => {
      const response = await provider.generateReply(
        'System prompt',
        'User prompt'
      );

      expect(response.latency).toBeDefined();
      expect(typeof response.latency).toBe('number');
      expect(response.latency).toBeGreaterThanOrEqual(0);
    });

    it('should clean preambles from response', async () => {
      // Mock a response with preamble
      const MockLoader = require('../../src/model-loader').default;
      const mockEngine = {
        chat: {
          completions: {
            create: jest.fn().mockImplementation(async function* () {
              yield {
                choices: [{
                  delta: { content: "Here's a professional LinkedIn reply: " }
                }]
              };
              yield {
                choices: [{
                  delta: { content: 'Actual content' }
                }]
              };
            })
          }
        }
      };

      MockLoader.getInstance = jest.fn().mockReturnValue({
        loadModel: jest.fn().mockResolvedValue(mockEngine)
      });

      const cleanProvider = new WebLLMProvider();
      await cleanProvider.initialize();

      const response = await cleanProvider.generateReply('system', 'user');
      expect(response.reply).not.toContain("Here's a professional LinkedIn reply:");
      expect(response.reply).toContain('Actual content');
    });
  });

  describe('Provider Information', () => {
    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('Local AI (WebLLM)');
    });

    it('should return correct provider type', () => {
      expect(provider.getProviderType()).toBe('local');
    });

    it('should return model name', () => {
      const modelName = provider.getModelName();
      expect(modelName).toBeTruthy();
      expect(typeof modelName).toBe('string');
    });
  });

  describe('API Key Validation', () => {
    it('should always return true for validateApiKey', async () => {
      // Local provider doesn't need API key
      expect(await provider.validateApiKey('')).toBe(true);
      expect(await provider.validateApiKey('anything')).toBe(true);
    });
  });

  describe('Lifecycle Management', () => {
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

      // Can re-initialize
      await provider.initialize();
      expect(provider.isReady()).toBe(true);
    });
  });

  describe('Model Fallback Strategy', () => {
    it('should attempt fallback models on failure', async () => {
      const MockLoader = require('../../src/model-loader').default;
      let attempts = 0;

      MockLoader.getInstance = jest.fn().mockReturnValue({
        loadModel: jest.fn().mockImplementation(async (model: string) => {
          attempts++;
          if (attempts === 1) {
            throw new Error('First model failed');
          }
          return {
            chat: {
              completions: {
                create: jest.fn().mockImplementation(async function* () {
                  yield { choices: [{ delta: { content: 'Fallback reply' } }] };
                })
              }
            }
          };
        })
      });

      const fallbackProvider = new WebLLMProvider();
      await fallbackProvider.initialize();

      expect(attempts).toBeGreaterThan(1); // Should have tried fallback
    });
  });

  describe('Progress Callbacks', () => {
    it('should support progress callback during initialization', async () => {
      const progressCallback = jest.fn();
      const progressProvider = new WebLLMProvider({
        onProgress: progressCallback
      });

      await progressProvider.initialize();

      // Progress callback should have been called
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number),
          message: expect.any(String)
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should use proper error codes', async () => {
      const uninitializedProvider = new WebLLMProvider();

      try {
        await uninitializedProvider.generateReply('system', 'user');
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe(ProviderError.NOT_INITIALIZED);
      }
    });

    it('should handle network errors during generation', async () => {
      await provider.initialize();

      // Replace engine with failing one
      (provider as any).engine = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('Network error'))
          }
        }
      };

      await expect(
        provider.generateReply('system', 'user')
      ).rejects.toThrow('Network error');
    });
  });
});