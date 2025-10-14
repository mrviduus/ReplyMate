import { InferenceProvider, InferenceResponse, ProviderType, ProviderError } from '../../src/inference/inference-provider';

/**
 * Test suite for InferenceProvider interface
 * These tests define the contract that all providers must implement
 */

// Mock implementation for testing the interface
class MockProvider implements InferenceProvider {
  private initialized = false;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey || this.apiKey.length < 10) {
      throw new Error(ProviderError.INVALID_KEY);
    }
    this.initialized = true;
  }

  async generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse> {
    if (!this.initialized) {
      throw new Error('Provider not initialized');
    }

    return {
      reply: 'Mock reply',
      provider: 'mock',
      model: 'mock-model-1.0',
      tokensUsed: 50,
      latency: 1000
    };
  }

  async validateApiKey(key: string): Promise<boolean> {
    return key.length >= 10 && key.startsWith('mock-');
  }

  isReady(): boolean {
    return this.initialized;
  }

  getProviderName(): string {
    return 'Mock Provider';
  }

  getModelName(): string {
    return 'mock-model-1.0';
  }

  getProviderType(): ProviderType {
    return 'mock' as ProviderType;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }
}

describe('InferenceProvider Interface', () => {
  let provider: InferenceProvider;

  beforeEach(() => {
    provider = new MockProvider('mock-valid-key-123');
  });

  afterEach(async () => {
    if (provider) {
      await provider.dispose();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid API key', async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
      expect(provider.isReady()).toBe(true);
    });

    it('should fail initialization with invalid API key', async () => {
      const invalidProvider = new MockProvider('bad');
      await expect(invalidProvider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
      expect(invalidProvider.isReady()).toBe(false);
    });

    it('should fail initialization without API key', async () => {
      const noKeyProvider = new MockProvider();
      await expect(noKeyProvider.initialize()).rejects.toThrow(ProviderError.INVALID_KEY);
    });
  });

  describe('Reply Generation', () => {
    it('should generate reply with proper response format', async () => {
      await provider.initialize();

      const response = await provider.generateReply(
        'You are a helpful assistant',
        'Generate a LinkedIn reply'
      );

      expect(response).toHaveProperty('reply');
      expect(response).toHaveProperty('provider');
      expect(response).toHaveProperty('model');
      expect(typeof response.reply).toBe('string');
      expect(response.reply.length).toBeGreaterThan(0);
    });

    it('should fail if not initialized', async () => {
      const uninitializedProvider = new MockProvider('mock-valid-key');

      await expect(
        uninitializedProvider.generateReply('system', 'user')
      ).rejects.toThrow('Provider not initialized');
    });

    it('should include optional metrics in response', async () => {
      await provider.initialize();

      const response = await provider.generateReply('system', 'user');

      // Optional fields
      expect(response.tokensUsed).toBeDefined();
      expect(response.latency).toBeDefined();
      expect(typeof response.tokensUsed).toBe('number');
      expect(typeof response.latency).toBe('number');
    });
  });

  describe('API Key Validation', () => {
    it('should validate correct API key format', async () => {
      const isValid = await provider.validateApiKey('mock-valid-api-key');
      expect(isValid).toBe(true);
    });

    it('should reject invalid API key format', async () => {
      const isValid = await provider.validateApiKey('invalid');
      expect(isValid).toBe(false);
    });

    it('should reject empty API key', async () => {
      const isValid = await provider.validateApiKey('');
      expect(isValid).toBe(false);
    });
  });

  describe('Provider Information', () => {
    it('should return provider name', () => {
      const name = provider.getProviderName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should return model name', () => {
      const model = provider.getModelName();
      expect(typeof model).toBe('string');
      expect(model.length).toBeGreaterThan(0);
    });

    it('should return provider type', () => {
      const type = provider.getProviderType();
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
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
  });

  describe('Error Handling', () => {
    it('should use standardized error codes', async () => {
      const invalidProvider = new MockProvider('bad');

      try {
        await invalidProvider.initialize();
      } catch (error) {
        expect(error.message).toBe(ProviderError.INVALID_KEY);
      }
    });
  });
});

describe('InferenceResponse Type', () => {
  it('should have required fields', () => {
    const response: InferenceResponse = {
      reply: 'Test reply',
      provider: 'test',
      model: 'test-model'
    };

    expect(response.reply).toBeDefined();
    expect(response.provider).toBeDefined();
    expect(response.model).toBeDefined();
  });

  it('should allow optional fields', () => {
    const response: InferenceResponse = {
      reply: 'Test reply',
      provider: 'test',
      model: 'test-model',
      tokensUsed: 100,
      latency: 500,
      error: undefined
    };

    expect(response.tokensUsed).toBe(100);
    expect(response.latency).toBe(500);
  });
});

describe('ProviderType Enum', () => {
  it('should include all supported providers', () => {
    const validTypes: ProviderType[] = ['local', 'claude', 'gemini', 'openai'];

    validTypes.forEach(type => {
      expect(typeof type).toBe('string');
    });
  });
});

describe('ProviderError Enum', () => {
  it('should include all error types', () => {
    expect(ProviderError.INVALID_KEY).toBeDefined();
    expect(ProviderError.NETWORK_ERROR).toBeDefined();
    expect(ProviderError.RATE_LIMIT).toBeDefined();
    expect(ProviderError.PROVIDER_DOWN).toBeDefined();
    expect(ProviderError.INVALID_RESPONSE).toBeDefined();
    expect(ProviderError.QUOTA_EXCEEDED).toBeDefined();
    expect(ProviderError.NOT_INITIALIZED).toBeDefined();
  });
});