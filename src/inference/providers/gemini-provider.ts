/**
 * Gemini Provider - Google's Gemini API integration
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseProvider, InferenceResponse, ProviderType, ProviderError, ProviderConfig } from '../inference-provider';

/**
 * Gemini-specific configuration
 */
export interface GeminiConfig extends ProviderConfig {
  /** Gemini API key (required for initialization) */
  apiKey?: string;
  /** Model to use (defaults to gemini-1.5-flash) */
  model?: string;
}

/**
 * Default Gemini model
 */
const DEFAULT_MODEL = 'gemini-1.5-flash';

/**
 * Gemini API implementation of InferenceProvider
 */
export class GeminiProvider extends BaseProvider {
  private client: GoogleGenerativeAI | null = null;
  private apiKey: string;
  private model: string;

  constructor(config: GeminiConfig) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODEL;
  }

  /**
   * Initialize the Gemini client
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
      // Initialize Google Generative AI client
      this.client = new GoogleGenerativeAI(this.apiKey);

      // Verify API key with a minimal test
      await this.verifyApiKey();

      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      this.client = null;
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
      const model = this.client.getGenerativeModel({ model: this.model });
      await model.generateContent('Hi');
    } catch (error: any) {
      if (error.message?.includes('API_KEY_INVALID')) {
        throw new Error(ProviderError.INVALID_KEY);
      }
      // Ignore other errors during verification
    }
  }

  /**
   * Generate a reply using Gemini API
   */
  async generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse> {
    if (!this.initialized || !this.client) {
      throw new Error(ProviderError.NOT_INITIALIZED);
    }

    const { result, latency } = await this.measureLatency(async () => {
      try {
        const model = this.client!.getGenerativeModel({
          model: this.model,
          generationConfig: {
            maxOutputTokens: this.config.maxTokens || 150,
            temperature: this.config.temperature || 0.7,
            topP: 0.9,
          }
        });

        // Combine system and user prompts
        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

        const response = await model.generateContent(fullPrompt);
        const text = response.response.text();

        return {
          text: this.cleanReply(text),
          tokensUsed: undefined // Gemini doesn't provide token counts in the same way
        };
      } catch (error) {
        throw this.mapApiError(error);
      }
    });

    return {
      reply: result.text,
      provider: 'gemini',
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

    // Gemini API keys typically start with 'AIza'
    return key.startsWith('AIza') || key.length > 20;
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
    const errorMessage = (error.message || '').toLowerCase();

    if (errorMessage.includes('quota')) {
      return new Error(ProviderError.RATE_LIMIT);
    }

    if (errorMessage.includes('api_key_invalid')) {
      return new Error(ProviderError.INVALID_KEY);
    }

    if (errorMessage.includes('unavailable')) {
      return new Error(ProviderError.PROVIDER_DOWN);
    }

    return error;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Gemini API';
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
    return 'gemini';
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.client = null;
    this.initialized = false;
  }
}