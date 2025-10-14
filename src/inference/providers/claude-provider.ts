/**
 * Claude Provider - Anthropic's Claude API integration
 */

const Anthropic = require('@anthropic-ai/sdk');
import { BaseProvider, InferenceResponse, ProviderType, ProviderError, ProviderConfig } from '../inference-provider';

/**
 * Claude-specific configuration
 */
export interface ClaudeConfig extends ProviderConfig {
  /** Claude API key (required for initialization) */
  apiKey?: string;
  /** Model to use (defaults to claude-3-5-sonnet-20241022) */
  model?: string;
}

/**
 * Default Claude model
 */
const DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

/**
 * Available Claude models
 */
export const CLAUDE_MODELS = {
  SONNET_3_5: 'claude-3-5-sonnet-20241022',
  OPUS_3: 'claude-3-opus-20240229',
  SONNET_3: 'claude-3-sonnet-20240229',
  HAIKU_3: 'claude-3-haiku-20240307'
} as const;

/**
 * Claude API implementation of InferenceProvider
 */
export class ClaudeProvider extends BaseProvider {
  private client: Anthropic | null = null;
  private apiKey: string;
  private model: string;

  constructor(config: ClaudeConfig) {
    super(config);
    this.apiKey = config.apiKey || '';
    this.model = config.model || DEFAULT_MODEL;
  }

  /**
   * Initialize the Claude client
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
      // Initialize Anthropic client
      // Note: We're in a browser extension environment
      this.client = new Anthropic({
        apiKey: this.apiKey
        // The SDK should handle browser environment automatically
      } as any); // Use 'as any' to bypass TypeScript check for browser usage

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
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: 'Hi'
        }]
      });
    } catch (error: any) {
      if (error.status === 401 || error.message?.includes('Invalid API key')) {
        throw new Error('Invalid API key');
      }
      // For verification, we can ignore other errors
      // The key is valid if it's not a 401
      if (error.status !== 429) { // Rate limit is okay for verification
        throw error;
      }
    }
  }

  /**
   * Generate a reply using Claude API
   */
  async generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse> {
    if (!this.initialized || !this.client) {
      throw new Error(ProviderError.NOT_INITIALIZED);
    }

    const { result, latency } = await this.measureLatency(async () => {
      try {
        const message = await this.client!.messages.create({
          model: this.model,
          max_tokens: this.config.maxTokens || 150,
          temperature: this.config.temperature || 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt
            }
          ]
        });

        // Extract text from response
        const content = message.content[0];
        if (content.type !== 'text') {
          throw new Error(ProviderError.INVALID_RESPONSE);
        }

        return {
          text: this.cleanReply(content.text),
          tokensUsed: message.usage ?
            (message.usage.input_tokens + message.usage.output_tokens) :
            undefined
        };
      } catch (error) {
        // Map API errors to our error codes
        throw this.mapApiError(error);
      }
    });

    return {
      reply: result.text,
      provider: 'claude',
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

    // Claude API keys start with 'sk-ant-'
    return key.startsWith('sk-ant-');
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
    if (error.status === 429) {
      return new Error(ProviderError.RATE_LIMIT);
    }

    if (error.status === 401) {
      return new Error(ProviderError.INVALID_KEY);
    }

    if (error.status === 503 || error.status === 502) {
      return new Error(ProviderError.PROVIDER_DOWN);
    }

    if (error.status === 400) {
      return new Error(ProviderError.INVALID_RESPONSE);
    }

    if (error.message?.includes('Network')) {
      return new Error(ProviderError.NETWORK_ERROR);
    }

    // Return original error if not mapped
    return error;
  }

  /**
   * Check if error is authentication related
   */
  private isAuthError(error: any): boolean {
    return error.status === 401 ||
           error.message?.includes('Invalid API key') ||
           error.message?.includes('authentication');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Claude API';
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
    return 'claude';
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.client = null;
    this.initialized = false;
  }

  /**
   * Clean the reply text
   */
  protected cleanReply(text: string): string {
    // Use base class cleaning which handles LinkedIn-specific preambles
    const cleaned = super.cleanReply(text, 150);

    // Additional Claude-specific cleaning if needed
    // Claude is generally good at following instructions,
    // but we ensure no meta-commentary
    const lines = cleaned.split('\n');
    const contentLines = lines.filter(line => {
      const lower = line.toLowerCase().trim();
      return !lower.includes('as an ai') &&
             !lower.includes('i\'m claude') &&
             !lower.includes('as claude');
    });

    return contentLines.join(' ').trim();
  }

  /**
   * Get provider capabilities
   */
  static getCapabilities() {
    return {
      streaming: false, // We're not using streaming for simplicity
      functionCalling: false,
      imageInput: true,
      maxContextLength: 200000,
      requiresInternet: true,
      costPer1kTokens: {
        input: 0.003,
        output: 0.015
      }
    };
  }
}