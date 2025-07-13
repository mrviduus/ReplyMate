import { pipeline } from '@huggingface/transformers';
import { Logger } from '../shared/utils';

interface PipelineConfig {
  maxTokens?: number;
  temperature?: number;
  doSample?: boolean;
}

/**
 * Flan-T5 pipeline for generating professional LinkedIn responses
 * Uses Xenova/flan-t5-small int8 ONNX model for efficient inference
 */
export class FlanT5Pipeline {
  private static instance: FlanT5Pipeline;
  private model: any = null;
  private logger = new Logger('FlanT5Pipeline');
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): FlanT5Pipeline {
    if (!FlanT5Pipeline.instance) {
      FlanT5Pipeline.instance = new FlanT5Pipeline();
    }
    return FlanT5Pipeline.instance;
  }

  /**
   * Initialize the Flan-T5 model pipeline
   */
  async initialize(): Promise<void> {
    if (this.model) {
      this.logger.info('Flan-T5 model already loaded');
      return;
    }

    if (this.isLoading && this.loadPromise) {
      this.logger.info('Model loading in progress, waiting...');
      await this.loadPromise;
      return;
    }

    this.isLoading = true;
    this.loadPromise = this.loadModel();
    
    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  private async loadModel(): Promise<void> {
    try {
      this.logger.info('Loading Flan-T5-Small model...');
      
      // Load the Flan-T5-Small model with int8 quantization
      this.model = await pipeline(
        'text2text-generation',
        'Xenova/flan-t5-small',
        {
          revision: 'main',
          progress_callback: (progress: any) => {
            if (progress.status === 'downloading') {
              this.logger.info(`Downloading: ${progress.name} (${Math.round(progress.progress || 0)}%)`);
            } else if (progress.status === 'ready') {
              this.logger.info(`Model component ready: ${progress.name}`);
            }
          }
        }
      );

      this.logger.info('Flan-T5-Small model loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load Flan-T5 model:', error);
      throw error;
    }
  }

  /**
   * Generate a professional LinkedIn response using Flan-T5
   */
  async generate(
    comment: string, 
    config: PipelineConfig = { maxTokens: 80, temperature: 0.7, doSample: true }
  ): Promise<string> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Flan-T5 model not loaded');
    }

    try {
      // Create a professional prompt that leverages Flan-T5's instruction-following capabilities
      const prompt = `You are Mana, an optometrist who communicates professionally on LinkedIn. Write a brief, professional response to this message: "${comment}"

Response:`;

      this.logger.info('Generating response with Flan-T5 for:', comment.substring(0, 100) + '...');

      const result = await this.model(prompt, {
        max_new_tokens: config.maxTokens || 80,
        temperature: config.temperature || 0.7,
        do_sample: config.doSample !== false,
        return_full_text: false
      });

      let response = '';
      if (Array.isArray(result) && result.length > 0) {
        response = result[0].generated_text || result[0].text || '';
      } else if (typeof result === 'object' && result.generated_text) {
        response = result.generated_text;
      }

      // Clean up the response
      response = this.cleanResponse(response);
      
      this.logger.info('Generated response:', response);
      return response;

    } catch (error) {
      this.logger.error('Failed to generate response:', error);
      throw error;
    }
  }

  /**
   * Clean and format the generated response
   */
  private cleanResponse(response: string): string {
    if (!response) return '';

    let cleaned = response.trim();

    // Remove common artifacts and prefixes
    cleaned = cleaned
      .replace(/^(Response:|Reply:|Answer:)\s*/i, '')
      .replace(/^["'`]|["'`]$/g, '') // Remove surrounding quotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Ensure professional tone and proper punctuation
    if (cleaned && !/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    // Ensure it starts with capital letter
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
  }

  /**
   * Check if the model is loaded and ready
   */
  isReady(): boolean {
    return this.model !== null && !this.isLoading;
  }

  /**
   * Get the current model status
   */
  getStatus(): 'not-loaded' | 'loading' | 'ready' | 'error' {
    if (this.model) return 'ready';
    if (this.isLoading) return 'loading';
    return 'not-loaded';
  }

  /**
   * Dispose of the model to free memory
   */
  dispose(): void {
    if (this.model && typeof this.model.dispose === 'function') {
      this.model.dispose();
    }
    this.model = null;
    this.logger.info('Flan-T5 model disposed');
  }
}

// Export singleton instance
export const flanT5Pipeline = FlanT5Pipeline.getInstance();
