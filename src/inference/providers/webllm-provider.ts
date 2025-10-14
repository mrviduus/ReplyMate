/**
 * WebLLM Provider - Local AI inference using WebLLM
 * Wraps existing WebLLM functionality to implement InferenceProvider interface
 */

import { MLCEngineInterface, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { BaseProvider, InferenceResponse, ProviderType, ProviderError, ProviderConfig } from '../inference-provider';
import OptimizedModelLoader, { ModelLoadingState } from '../../model-loader';

/**
 * Configuration specific to WebLLM
 */
export interface WebLLMConfig extends ProviderConfig {
  /** Callback for initialization progress */
  onProgress?: (progress: { progress: number; message: string }) => void;
  /** Custom model fallback list */
  fallbackModels?: string[];
}

/**
 * Default models for WebLLM in order of preference
 */
const DEFAULT_MODELS = [
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',  // Optimal balance
  'gemma-2-2b-it-q4f16_1-MLC',          // Good alternative
  'Phi-3.5-mini-instruct-q4f16_1-MLC',  // Lightweight
  'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'   // Ultra-light fallback
];

/**
 * WebLLM implementation of InferenceProvider
 */
export class WebLLMProvider extends BaseProvider {
  private engine: MLCEngineInterface | null = null;
  private modelLoader: OptimizedModelLoader;
  private currentModel: string;
  private onProgress?: (progress: { progress: number; message: string }) => void;
  private fallbackModels: string[];

  constructor(config: WebLLMConfig = {}) {
    super(config);
    this.modelLoader = OptimizedModelLoader.getInstance();
    this.currentModel = config.model || DEFAULT_MODELS[0];
    this.onProgress = config.onProgress;
    this.fallbackModels = config.fallbackModels || DEFAULT_MODELS;
  }

  /**
   * Initialize the WebLLM engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Try primary model first
      this.engine = await this.loadModelWithFallback();
      this.initialized = true;
    } catch (error) {
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Load model with fallback strategy
   */
  private async loadModelWithFallback(): Promise<MLCEngineInterface> {
    const modelsToTry = [this.currentModel, ...this.fallbackModels.filter(m => m !== this.currentModel)];
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        // Report progress if callback provided
        if (this.onProgress) {
          this.onProgress({
            progress: 0,
            message: `Loading ${model}...`
          });
        }

        const engine = await this.modelLoader.loadModel(
          model,
          (state: ModelLoadingState) => {
            // Pass progress to callback
            if (this.onProgress) {
              this.onProgress({
                progress: Math.round(state.progress * 100),
                message: state.progressText || `Loading ${model}...`
              });
            }
          },
          {
            maxRetries: 2,
            timeoutMs: 120000,
            preload: false
          }
        );

        // Successfully loaded
        this.currentModel = model;

        if (this.onProgress) {
          this.onProgress({
            progress: 100,
            message: 'Model loaded successfully'
          });
        }

        return engine;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Failed to load model ${model}:`, error);

        // Try next model
        continue;
      }
    }

    // All models failed
    throw new Error(
      `Failed to load any WebLLM model. Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Generate a reply using WebLLM
   */
  async generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse> {
    if (!this.initialized || !this.engine) {
      throw new Error(ProviderError.NOT_INITIALIZED);
    }

    const { result: reply, latency } = await this.measureLatency(async () => {
      const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      let fullReply = '';

      try {
        const completion = await this.engine!.chat.completions.create({
          stream: true,
          messages: messages,
          max_tokens: this.config.maxTokens || 150,
          temperature: this.config.temperature || 0.7,
          top_p: 0.9,
          stop: ['\n\n', '\n\n\n']
        });

        // Collect streamed response
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullReply += delta;
          }
        }
      } catch (error) {
        console.error('WebLLM generation error:', error);
        throw error;
      }

      return this.cleanReply(fullReply);
    });

    return {
      reply,
      provider: 'local',
      model: this.currentModel,
      latency
    };
  }

  /**
   * Clean the generated reply
   */
  protected cleanReply(text: string, maxLength: number = 150): string {
    // Remove common preambles specific to LinkedIn replies
    const preamblePatterns = [
      /^Here'?s? (?:a |the |your |my )?(?:professional |rewritten |revised |improved )?(?:LinkedIn |response|reply|version|comment).*?:\s*/i,
      /^This (?:is |would be |could be )?(?:a |the |your |my )?(?:LinkedIn |response|reply).*?:\s*/i,
      /^(?:Sure|Certainly|Absolutely)[,!]?\s*(?:here'?s?|this is).*?:\s*/i,
      /^I'?(?:ve|ll|d)? (?:rewritten|revised|created|generated|made).*?:\s*/i,
      /^(?:Response|Reply|Comment|Answer):\s*/i,
      /^Here you go:\s*/i,
      /^.*?(?:meets?|meeting|fulfill?s?) (?:the |your )?requirements?.*?:\s*/i,
    ];

    let cleaned = text.trim();
    for (const pattern of preamblePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove any lines that are just meta-commentary
    const lines = cleaned.split('\n');
    const contentLines = lines.filter(line => {
      const lower = line.toLowerCase().trim();
      return !lower.startsWith('here') &&
             !lower.includes('rewritten') &&
             !lower.includes('requirements') &&
             !lower.includes('professional linkedin');
    });

    cleaned = contentLines.join(' ').trim();

    // Limit to 1-2 sentences for LinkedIn
    const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const limitedSentences = sentences.slice(0, 2).join('. ');
    const finalReply = limitedSentences.trim() + (cleaned.endsWith('?') ? '?' : '.');

    return finalReply;
  }

  /**
   * Validate API key (always true for local)
   */
  async validateApiKey(key: string): Promise<boolean> {
    // Local provider doesn't need API key
    return true;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Local AI (WebLLM)';
  }

  /**
   * Get current model name
   */
  getModelName(): string {
    return this.currentModel;
  }

  /**
   * Get provider type
   */
  getProviderType(): ProviderType {
    return 'local';
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    if (this.engine) {
      try {
        // WebLLM doesn't have a direct dispose method
        // but we can null the reference
        this.engine = null;
      } catch (error) {
        console.warn('Error disposing WebLLM engine:', error);
      }
    }

    this.initialized = false;
  }

  /**
   * Get current engine status
   */
  getEngineStatus(): {
    ready: boolean;
    model: string;
    cached: boolean;
  } {
    return {
      ready: this.isReady(),
      model: this.currentModel,
      cached: true // WebLLM models are cached after first load
    };
  }
}