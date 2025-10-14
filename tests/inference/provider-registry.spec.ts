import { ProviderRegistry } from '../../src/inference/provider-registry';
import { InferenceProvider, ProviderType, ProviderConfig } from '../../src/inference/inference-provider';

describe('ProviderRegistry', () => {
  describe('Provider Registration', () => {
    it('should register and retrieve providers', () => {
      const mockProvider = jest.fn();

      ProviderRegistry.register('mock' as ProviderType, mockProvider);
      const retrieved = ProviderRegistry.getProviderClass('mock' as ProviderType);

      expect(retrieved).toBe(mockProvider);
    });

    it('should throw error for unregistered provider type', () => {
      expect(() => {
        ProviderRegistry.getProviderClass('unknown' as ProviderType);
      }).toThrow('Provider type not registered: unknown');
    });

    it('should list all registered provider types', () => {
      // Registry should have at least local provider registered by default
      const types = ProviderRegistry.getRegisteredTypes();
      expect(types).toContain('local');
    });
  });

  describe('Provider Creation', () => {
    it('should create local provider without API key', () => {
      const provider = ProviderRegistry.create('local');
      expect(provider).toBeDefined();
      expect(provider.getProviderType()).toBe('local');
    });

    it('should create Claude provider with API key', () => {
      const provider = ProviderRegistry.create('claude', { apiKey: 'sk-ant-test-key' });
      expect(provider).toBeDefined();
      expect(provider.getProviderType()).toBe('claude');
    });

    it('should create Gemini provider with API key', () => {
      const provider = ProviderRegistry.create('gemini', { apiKey: 'AIza-test-key' });
      expect(provider).toBeDefined();
      expect(provider.getProviderType()).toBe('gemini');
    });

    it('should create OpenAI provider with API key', () => {
      const provider = ProviderRegistry.create('openai', { apiKey: 'sk-test-key' });
      expect(provider).toBeDefined();
      expect(provider.getProviderType()).toBe('openai');
    });

    it('should throw error for external provider without API key', () => {
      expect(() => {
        ProviderRegistry.create('claude');
      }).toThrow('API key required for provider: claude');
    });

    it('should pass config to provider constructor', () => {
      const config: ProviderConfig = {
        apiKey: 'test-key',
        model: 'custom-model',
        timeout: 5000,
        maxTokens: 200,
        temperature: 0.8
      };

      const provider = ProviderRegistry.create('claude', config);
      expect(provider).toBeDefined();
      // Provider should have access to config (we'll verify this in implementation)
    });
  });

  describe('Provider Availability', () => {
    it('should check if provider type is available', () => {
      expect(ProviderRegistry.isAvailable('local')).toBe(true);
      expect(ProviderRegistry.isAvailable('unknown' as ProviderType)).toBe(false);
    });

    it('should get available providers list', () => {
      const available = ProviderRegistry.getAvailableProviders();

      expect(available).toContain('local');
      // External providers should be available if SDKs are installed
      expect(available.length).toBeGreaterThan(0);
    });

    it('should validate provider type string', () => {
      expect(ProviderRegistry.validateProviderType('local')).toBe(true);
      expect(ProviderRegistry.validateProviderType('claude')).toBe(true);
      expect(ProviderRegistry.validateProviderType('gemini')).toBe(true);
      expect(ProviderRegistry.validateProviderType('openai')).toBe(true);
      expect(ProviderRegistry.validateProviderType('invalid')).toBe(false);
    });
  });

  describe('Provider Metadata', () => {
    it('should get provider metadata', () => {
      const metadata = ProviderRegistry.getProviderMetadata('local');

      expect(metadata).toBeTruthy();
      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('requiresApiKey');
      expect(metadata).toHaveProperty('description');
      expect(metadata?.requiresApiKey).toBe(false);
    });

    it('should get metadata for external providers', () => {
      const claudeMetadata = ProviderRegistry.getProviderMetadata('claude');

      expect(claudeMetadata).toBeTruthy();
      expect(claudeMetadata?.name).toBe('Claude API');
      expect(claudeMetadata?.requiresApiKey).toBe(true);
      expect(claudeMetadata?.description).toContain('Anthropic');
    });

    it('should return null for unknown provider metadata', () => {
      const metadata = ProviderRegistry.getProviderMetadata('unknown' as ProviderType);
      expect(metadata).toBeNull();
    });
  });

  describe('Default Provider', () => {
    it('should have local as default provider', () => {
      const defaultType = ProviderRegistry.getDefaultProviderType();
      expect(defaultType).toBe('local');
    });

    it('should create default provider without specifying type', () => {
      const provider = ProviderRegistry.createDefault();
      expect(provider).toBeDefined();
      expect(provider.getProviderType()).toBe('local');
    });
  });

  describe('Provider Initialization Check', () => {
    it('should verify all registered providers implement interface', () => {
      // Only test the actual provider types we support
      const validTypes: ProviderType[] = ['local', 'claude', 'gemini', 'openai'];

      validTypes.forEach(type => {
        const config = type === 'local' ? {} : { apiKey: 'test-key' };
        const provider = ProviderRegistry.create(type, config);

        // Verify all interface methods exist
        expect(typeof provider.initialize).toBe('function');
        expect(typeof provider.generateReply).toBe('function');
        expect(typeof provider.validateApiKey).toBe('function');
        expect(typeof provider.isReady).toBe('function');
        expect(typeof provider.getProviderName).toBe('function');
        expect(typeof provider.getModelName).toBe('function');
        expect(typeof provider.getProviderType).toBe('function');
        expect(typeof provider.dispose).toBe('function');
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages', () => {
      expect(() => {
        ProviderRegistry.create('invalid' as ProviderType);
      }).toThrow(/Provider type not registered/);

      expect(() => {
        ProviderRegistry.create('claude', { apiKey: '' });
      }).toThrow(/API key required/);
    });
  });
});