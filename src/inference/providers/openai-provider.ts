/**
 * OpenAI Provider - OpenAI API integration
 */

import OpenAI from 'openai';
import { BaseProvider, InferenceResponse, ProviderType, ProviderError, ProviderConfig } from '../inference-provider';

/**
 * OpenAI-specific configuration
 */
export interface OpenAIConfig extends ProviderConfig {
  /** OpenAI API key (required for initialization) */
  apiKey?: string;
  /** Model to use (defaults to gpt-4o-mini) */
  model?: string;
  /** Organization ID (optional) */
  organization?: string;
}

/**
 * Default OpenAI model
 */
const DEFAULT_MODEL = 'gpt-4o-mini';

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS = {
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4: 'gpt-4',
  GPT_35_TURBO: 'gpt-3.5-turbo'
} as const;

/**
 * OpenAI API implementation of InferenceProvider
 */
export class OpenAIProvider extends BaseProvider {
  private client: OpenAI | null = null;
  private apiKey: string;
  private model: string;
  private organization?: string;

  constructor(config: OpenAIConfig) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODEL;
    this.organization = config.organization;
  }

  /**
   * Initialize the OpenAI client
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate API key format
    if (!this.validateApiKeyFormat(this.apiKey)) {
      throw new Error(ProviderError.INVALID_KEY);
    }

    try {
      // Initialize OpenAI client
      this.client = new OpenAI({
        apiKey: this.apiKey,
        organization: this.organization,
        dangerouslyAllowBrowser: true // For browser environment
      });

      // Verify API key with a minimal test request
      await this.verifyApiKey();

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.client = null;

      // Handle specific error types
      if (this.isAuthError(error)) {
        throw new Error(ProviderError.INVALID_KEY);
      }

      throw error;
    }
  }

  /**
   * Verify API key with a test request
   */
  private async verifyApiKey(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      // Make a minimal request to verify the key
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{
          role: 'user',
          content: 'Hi'
        }],
        max_tokens: 10
      });
    } catch (error: any) {
      if (error.status === 401 || error.message?.includes('invalid_api_key')) {
        throw new Error(ProviderError.INVALID_KEY);
      }
      // For verification, we can ignore other errors
      // The key is valid if it's not a 401
      if (error.status !== 429) { // Rate limit is okay for verification
        throw error;
      }
    }
  }

  /**
   * Generate a reply using OpenAI API
   */
  async generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse> {
    if (!this.initialized || !this.client) {
      throw new Error(ProviderError.NOT_INITIALIZED);
    }

    const { result, latency } = await this.measureLatency(async () => {
      try {
        const completion = await this.client!.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: this.config.maxTokens || 150,
          temperature: this.config.temperature || 0.7
        });

        const reply = completion.choices[0]?.message?.content || '';

        return {
          text: this.cleanReply(reply),
          tokensUsed: completion.usage
            ? (completion.usage.prompt_tokens + completion.usage.completion_tokens)
            : undefined
        };
      } catch (error) {
        // Map API errors to our error codes
        throw this.mapApiError(error);
      }
    });

    return {
      reply: result.text,
      provider: 'openai',
      model: this.model,
      tokensUsed: result.tokensUsed,
      latency
    };
  }

  /**
   * Validate API key format
   */
  private validateApiKeyFormat(key: string): boolean {
    if (!key || key.length < 10) {
      return false;
    }

    // OpenAI API keys have different prefixes based on type
    // sk-proj- for project keys (new format)
    // sk- for legacy keys
    return key.startsWith('sk-') || key.startsWith('sk-proj-');
  }

  /**
   * Validate API key (public method)
   */
  async validateApiKey(key: string): Promise<boolean> {
    return this.validateApiKeyFormat(key);
  }

  /**
   * Map API errors to our error codes
   */
  private mapApiError(error: any): Error {
    if (error.status === 429 || error.code === 'rate_limit_exceeded') {
      return new Error(ProviderError.RATE_LIMIT);
    }

    if (error.status === 401 || error.code === 'invalid_api_key') {
      return new Error(ProviderError.INVALID_KEY);
    }

    if (error.status === 503 || error.status === 502) {
      return new Error(ProviderError.PROVIDER_DOWN);
    }

    if (error.status === 400 || error.code === 'invalid_request_error') {
      return new Error(ProviderError.INVALID_RESPONSE);
    }

    if (error.message?.includes('Network')) {
      return new Error(ProviderError.NETWORK_ERROR);
    }

    // Check for quota errors
    if (error.code === 'insufficient_quota' || error.message?.includes('quota')) {
      return new Error(ProviderError.RATE_LIMIT);
    }

    // Return original error if not mapped
    return error;
  }

  /**
   * Check if error is authentication related
   */
  private isAuthError(error: any): boolean {
    return error.status === 401 ||
           error.code === 'invalid_api_key' ||
           error.message?.includes('invalid_api_key') ||
           error.message?.includes('authentication');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'OpenAI API';
  }

  /**
   * Get model name
   */
  getModelName(): string {
    return this.model;
  }

  /**
   * Get provider type
   */
  getProviderType(): ProviderType {
    return 'openai';
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Get provider capabilities
   */
  static getCapabilities() {
    return {
      streaming: true,
      functionCalling: true,
      imageInput: true, // For GPT-4V models
      maxContextLength: {
        'gpt-4o': 128000,
        'gpt-4o-mini': 128000,
        'gpt-4-turbo': 128000,
        'gpt-4': 8192,
        'gpt-3.5-turbo': 16385
      },
      requiresInternet: true,
      costPer1kTokens: {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4-turbo': { input: 0.01, output: 0.03 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 }
      }
    };
  }
}