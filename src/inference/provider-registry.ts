/**
 * Provider Registry - Factory pattern for creating inference providers
 */

import { InferenceProvider, ProviderType, ProviderConfig } from './inference-provider';

/**
 * Provider metadata for UI and configuration
 */
export interface ProviderMetadata {
  name: string;
  description: string;
  requiresApiKey: boolean;
  defaultModel?: string;
  apiKeyPrefix?: string;
  apiKeyLength?: number;
  pricingUrl?: string;
  docsUrl?: string;
}

/**
 * Provider constructor type
 */
type ProviderConstructor = new (config?: ProviderConfig) => InferenceProvider;

/**
 * Registry for managing inference providers
 */
export class ProviderRegistry {
  private static providers: Map<ProviderType, ProviderConstructor> = new Map();
  private static metadata: Map<ProviderType, ProviderMetadata> = new Map();
  private static initialized = false;

  /**
   * Initialize registry with default providers
   */
  private static initialize(): void {
    if (this.initialized) return;

    // Register metadata for all providers
    this.registerMetadata('local', {
      name: 'Local AI',
      description: 'Privacy-first AI that runs entirely on your device',
      requiresApiKey: false,
      defaultModel: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
    });

    this.registerMetadata('claude', {
      name: 'Claude API',
      description: 'Anthropic\'s Claude models via API',
      requiresApiKey: true,
      defaultModel: 'claude-3-5-sonnet-20241022',
      apiKeyPrefix: 'sk-ant-',
      pricingUrl: 'https://www.anthropic.com/pricing',
      docsUrl: 'https://console.anthropic.com/'
    });

    this.registerMetadata('gemini', {
      name: 'Gemini API',
      description: 'Google\'s Gemini models via API',
      requiresApiKey: true,
      defaultModel: 'gemini-1.5-flash',
      apiKeyPrefix: 'AIza',
      pricingUrl: 'https://ai.google.dev/pricing',
      docsUrl: 'https://makersuite.google.com/app/apikey'
    });

    this.registerMetadata('openai', {
      name: 'OpenAI API',
      description: 'OpenAI\'s GPT models via API',
      requiresApiKey: true,
      defaultModel: 'gpt-4o-mini',
      apiKeyPrefix: 'sk-',
      apiKeyLength: 51,
      pricingUrl: 'https://openai.com/pricing',
      docsUrl: 'https://platform.openai.com/api-keys'
    });

    this.initialized = true;

    // Note: Actual provider classes will be registered when they're imported
    // This avoids circular dependencies and lazy loads providers
  }

  /**
   * Register a provider class
   */
  static register(type: ProviderType, providerClass: ProviderConstructor): void {
    this.initialize();
    this.providers.set(type, providerClass);
  }

  /**
   * Register provider metadata
   */
  private static registerMetadata(type: ProviderType, metadata: ProviderMetadata): void {
    this.metadata.set(type, metadata);
  }

  /**
   * Get provider class by type
   */
  static getProviderClass(type: ProviderType): ProviderConstructor {
    this.initialize();
    const providerClass = this.providers.get(type);

    if (!providerClass) {
      throw new Error(`Provider type not registered: ${type}`);
    }

    return providerClass;
  }

  /**
   * Create a provider instance
   */
  static create(type: ProviderType, config?: ProviderConfig): InferenceProvider {
    this.initialize();

    // Lazy load the provider to avoid circular dependencies
    this.lazyLoadProvider(type);

    // Validate API key requirement
    const metadata = this.metadata.get(type);
    if (metadata?.requiresApiKey && !config?.apiKey) {
      throw new Error(`API key required for provider: ${type}`);
    }

    const ProviderClass = this.getProviderClass(type);
    return new ProviderClass(config);
  }

  /**
   * Create default provider (local)
   */
  static createDefault(): InferenceProvider {
    return this.create('local');
  }

  /**
   * Get default provider type
   */
  static getDefaultProviderType(): ProviderType {
    return 'local';
  }

  /**
   * Check if provider type is available
   */
  static isAvailable(type: ProviderType): boolean {
    this.initialize();

    // Try to lazy load the provider
    try {
      this.lazyLoadProvider(type);
      return this.providers.has(type);
    } catch {
      return false;
    }
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): ProviderType[] {
    this.initialize();

    const available: ProviderType[] = [];
    const possibleTypes: ProviderType[] = ['local', 'claude', 'gemini', 'openai'];

    for (const type of possibleTypes) {
      if (this.isAvailable(type)) {
        available.push(type);
      }
    }

    return available;
  }

  /**
   * Get registered provider types
   */
  static getRegisteredTypes(): ProviderType[] {
    this.initialize();

    // Ensure all providers are lazy loaded
    const types: ProviderType[] = ['local', 'claude', 'gemini', 'openai'];
    types.forEach(type => {
      try {
        this.lazyLoadProvider(type);
      } catch {
        // Provider not available, skip
      }
    });

    return Array.from(this.providers.keys());
  }

  /**
   * Validate if string is valid provider type
   */
  static validateProviderType(type: string): type is ProviderType {
    const validTypes: ProviderType[] = ['local', 'claude', 'gemini', 'openai'];
    return validTypes.includes(type as ProviderType);
  }

  /**
   * Get provider metadata
   */
  static getProviderMetadata(type: ProviderType): ProviderMetadata | null {
    this.initialize();
    return this.metadata.get(type) || null;
  }

  /**
   * Lazy load provider implementation
   */
  private static lazyLoadProvider(type: ProviderType): void {
    // Skip if already loaded
    if (this.providers.has(type)) {
      return;
    }

    // Import actual provider implementations
    if (type === 'local') {
      // Import WebLLMProvider
      try {
        const { WebLLMProvider } = require('./providers/webllm-provider');
        this.register('local', WebLLMProvider);
      } catch (error) {
        console.warn('WebLLMProvider not available:', error);
        // Fall back to mock for testing
        class MockLocalProvider implements InferenceProvider {
          async initialize(): Promise<void> {}
          async generateReply(systemPrompt: string, userPrompt: string) {
            return { reply: 'Local mock reply', provider: 'local', model: 'mock' };
          }
          async validateApiKey(key: string): Promise<boolean> { return true; }
          isReady(): boolean { return true; }
          getProviderName(): string { return 'Local AI'; }
          getModelName(): string { return 'mock-model'; }
          getProviderType(): ProviderType { return 'local'; }
          async dispose(): Promise<void> {}
        }
        this.register('local', MockLocalProvider as any);
      }
    } else if (type === 'claude') {
      // Import ClaudeProvider
      try {
        const { ClaudeProvider } = require('./providers/claude-provider');
        this.register('claude', ClaudeProvider);
      } catch (error) {
        console.warn('ClaudeProvider not available:', error);
        // Fall back to mock for testing
        class MockClaudeProvider implements InferenceProvider {
          constructor(private config?: ProviderConfig) {}
          async initialize(): Promise<void> {}
          async generateReply(systemPrompt: string, userPrompt: string) {
            return { reply: 'Claude mock reply', provider: 'claude', model: 'mock' };
          }
          async validateApiKey(key: string): Promise<boolean> {
            return key.startsWith('sk-ant-');
          }
          isReady(): boolean { return true; }
          getProviderName(): string { return 'Claude API'; }
          getModelName(): string { return 'claude-3-5-sonnet'; }
          getProviderType(): ProviderType { return 'claude'; }
          async dispose(): Promise<void> {}
        }
        this.register('claude', MockClaudeProvider as any);
      }
    } else if (type === 'gemini') {
      // Will import GeminiProvider when implemented
      class MockGeminiProvider implements InferenceProvider {
        constructor(private config?: ProviderConfig) {}
        async initialize(): Promise<void> {}
        async generateReply(systemPrompt: string, userPrompt: string) {
          return { reply: 'Gemini mock reply', provider: 'gemini', model: 'mock' };
        }
        async validateApiKey(key: string): Promise<boolean> {
          return key.startsWith('AIza');
        }
        isReady(): boolean { return true; }
        getProviderName(): string { return 'Gemini API'; }
        getModelName(): string { return 'gemini-1.5-flash'; }
        getProviderType(): ProviderType { return 'gemini'; }
        async dispose(): Promise<void> {}
      }
      this.register('gemini', MockGeminiProvider as any);
    } else if (type === 'openai') {
      // Will import OpenAIProvider when implemented
      class MockOpenAIProvider implements InferenceProvider {
        constructor(private config?: ProviderConfig) {}
        async initialize(): Promise<void> {}
        async generateReply(systemPrompt: string, userPrompt: string) {
          return { reply: 'OpenAI mock reply', provider: 'openai', model: 'mock' };
        }
        async validateApiKey(key: string): Promise<boolean> {
          return key.startsWith('sk-') && key.length === 51;
        }
        isReady(): boolean { return true; }
        getProviderName(): string { return 'OpenAI API'; }
        getModelName(): string { return 'gpt-4o-mini'; }
        getProviderType(): ProviderType { return 'openai'; }
        async dispose(): Promise<void> {}
      }
      this.register('openai', MockOpenAIProvider as any);
    }
  }

  /**
   * Clear registry (mainly for testing)
   */
  static clear(): void {
    this.providers.clear();
    this.metadata.clear();
    this.initialized = false;
  }
}