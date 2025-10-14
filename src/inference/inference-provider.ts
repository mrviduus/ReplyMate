/**
 * InferenceProvider Interface
 * Defines the contract for all AI inference providers (Local, Claude, Gemini, OpenAI)
 */

/**
 * Supported provider types
 */
export type ProviderType = 'local' | 'claude' | 'gemini' | 'openai' | 'mock';

/**
 * Standardized error codes for provider operations
 */
export enum ProviderError {
  INVALID_KEY = 'INVALID_KEY',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  PROVIDER_DOWN = 'PROVIDER_DOWN',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NOT_INITIALIZED = 'NOT_INITIALIZED',
  INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
  TIMEOUT = 'TIMEOUT',
  CONTEXT_TOO_LONG = 'CONTEXT_TOO_LONG'
}

/**
 * Response format returned by all providers
 */
export interface InferenceResponse {
  /** The generated reply text */
  reply: string;

  /** Provider that generated the reply */
  provider: string;

  /** Model used for generation */
  model: string;

  /** Number of tokens used (optional) */
  tokensUsed?: number;

  /** Response latency in milliseconds (optional) */
  latency?: number;

  /** Error information if partial failure (optional) */
  error?: string;
}

/**
 * Configuration options for provider initialization
 */
export interface ProviderConfig {
  /** API key for external providers */
  apiKey?: string;

  /** Model override (uses default if not specified) */
  model?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum tokens for response */
  maxTokens?: number;

  /** Temperature for generation (0-1) */
  temperature?: number;
}

/**
 * Interface that all inference providers must implement
 */
export interface InferenceProvider {
  /**
   * Initialize the provider (load model, validate API key, etc.)
   * @throws {Error} With ProviderError code if initialization fails
   */
  initialize(): Promise<void>;

  /**
   * Generate a reply based on prompts
   * @param systemPrompt - System instructions for the AI
   * @param userPrompt - The user's input/context
   * @returns Promise resolving to standardized response
   * @throws {Error} With ProviderError code if generation fails
   */
  generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse>;

  /**
   * Validate an API key without initializing
   * @param key - API key to validate
   * @returns Promise resolving to true if valid
   */
  validateApiKey(key: string): Promise<boolean>;

  /**
   * Check if provider is ready to generate replies
   * @returns true if initialized and ready
   */
  isReady(): boolean;

  /**
   * Get human-readable provider name
   * @returns Provider display name
   */
  getProviderName(): string;

  /**
   * Get current model name
   * @returns Model identifier
   */
  getModelName(): string;

  /**
   * Get provider type enum
   * @returns Provider type
   */
  getProviderType(): ProviderType;

  /**
   * Clean up resources (unload model, close connections, etc.)
   */
  dispose(): Promise<void>;
}

/**
 * Abstract base class for providers (optional helper)
 */
export abstract class BaseProvider implements InferenceProvider {
  protected initialized: boolean = false;
  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse>;
  abstract validateApiKey(key: string): Promise<boolean>;
  abstract getProviderName(): string;
  abstract getModelName(): string;
  abstract getProviderType(): ProviderType;

  isReady(): boolean {
    return this.initialized;
  }

  async dispose(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Helper method to track timing
   */
  protected async measureLatency<T>(operation: () => Promise<T>): Promise<{ result: T; latency: number }> {
    const startTime = performance.now();
    const result = await operation();
    const latency = Math.round(performance.now() - startTime);
    return { result, latency };
  }

  /**
   * Helper method to clean/truncate replies
   */
  protected cleanReply(text: string, maxLength: number = 150): string {
    // Remove common preambles
    const preamblePatterns = [
      /^Here'?s? (?:a |the |your |my )?(?:professional |rewritten |revised |improved )?(?:LinkedIn |response|reply|version|comment).*?:\s*/i,
      /^(?:Sure|Certainly|Absolutely)[,!]?\s*(?:here'?s?|this is).*?:\s*/i,
    ];

    let cleaned = text.trim();
    for (const pattern of preamblePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Limit to max length (word boundary aware)
    if (cleaned.length > maxLength) {
      const truncated = cleaned.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      cleaned = truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
    }

    return cleaned;
  }
}

/**
 * Provider capabilities (for future use)
 */
export interface ProviderCapabilities {
  /** Supports streaming responses */
  streaming: boolean;

  /** Supports function calling */
  functionCalling: boolean;

  /** Supports image inputs */
  imageInput: boolean;

  /** Maximum context length */
  maxContextLength: number;

  /** Requires internet connection */
  requiresInternet: boolean;

  /** Estimated cost per 1K tokens */
  costPer1kTokens?: number;
}