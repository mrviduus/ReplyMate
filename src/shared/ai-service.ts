import { pipeline } from '@huggingface/transformers';
import { GenerationConfig } from '../shared/types';
import { Logger, PerformanceMonitor } from '../shared/utils';
import { AVAILABLE_MODELS } from '../shared/constants';
import { flanT5Pipeline } from '../worker/pipeline';

export class AIService {
  private static instance: AIService;
  private models: Map<string, any> = new Map();
  private logger = new Logger('AIService');
  private loadingPromises: Map<string, Promise<any>> = new Map();

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Load a specific model
   */
  async loadModel(modelId: string): Promise<boolean> {
    try {
      // Check if already loaded
      if (this.models.has(modelId)) {
        this.logger.info(`Model ${modelId} already loaded`);
        return true;
      }

      // Check if already loading
      if (this.loadingPromises.has(modelId)) {
        this.logger.info(`Model ${modelId} already loading, waiting...`);
        await this.loadingPromises.get(modelId);
        return this.models.has(modelId);
      }

      const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
      if (!modelConfig) {
        throw new Error(`Model ${modelId} not found in available models`);
      }

      this.logger.info(`Loading model ${modelId}...`);

      const loadPromise = PerformanceMonitor.measureAsync(
        `load-model-${modelId}`,
        async () => {
          // Only handle sentiment analysis model, Flan-T5 is handled by pipeline
          if (modelConfig.type === 'sentiment-analysis') {
            const model = await pipeline('text-classification', modelConfig.path, {
              progress_callback: (progress: any) => {
                this.logger.info(`Model ${modelId} loading progress:`, progress);
              }
            });
            return model;
          } else {
            throw new Error(`Model type ${modelConfig.type} should be handled by dedicated pipeline`);
          }
        }
      );

      this.loadingPromises.set(modelId, loadPromise);

      const model = await loadPromise;
      this.models.set(modelId, model);
      this.loadingPromises.delete(modelId);

      this.logger.info(`Model ${modelId} loaded successfully`);
      return true;

    } catch (error) {
      this.logger.error(`Failed to load model ${modelId}:`, error);
      this.loadingPromises.delete(modelId);
      return false;
    }
  }

  /**
   * Generate a response using the Flan-T5 model
   */
  async generateResponse(
    prompt: string,
    config: GenerationConfig = {
      maxTokens: 80,
      temperature: 0.7,
      topP: 0.9,
      repeatPenalty: 1.1,
      stopSequences: []
    }
  ): Promise<string> {
    try {
      this.logger.info('Generating response with Flan-T5 for prompt:', prompt.substring(0, 100) + '...');

      const result = await PerformanceMonitor.measureAsync(
        'generate-response',
        async () => {
          return await flanT5Pipeline.generate(prompt, {
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            doSample: true
          });
        }
      );

      this.logger.info('Response generated successfully:', result.substring(0, 100) + '...');
      return result;

    } catch (error) {
      this.logger.error('Failed to generate response:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(text: string): Promise<{ label: string; confidence: number }> {
    try {
      const modelId = 'distilbert-sentiment';
      const model = this.models.get(modelId);

      if (!model) {
        const loaded = await this.loadModel(modelId);
        if (!loaded) {
          throw new Error(`Sentiment model ${modelId} not available`);
        }
        return this.analyzeSentiment(text);
      }

      const result = await model(text);
      const sentiment = result[0];

      return {
        label: sentiment.label,
        confidence: sentiment.score
      };

    } catch (error) {
      this.logger.error('Failed to analyze sentiment:', error);
      // Return neutral sentiment as fallback
      return { label: 'NEUTRAL', confidence: 0.5 };
    }
  }

  /**
   * Generate context-aware response using Flan-T5
   */
  async generateContextualResponse(
    incomingMessage: string,
    conversationHistory: string[] = [],
    userPreferences: any = {}
  ): Promise<string[]> {
    try {
      // Analyze sentiment of incoming message
      const sentiment = await this.analyzeSentiment(incomingMessage);
      
      // Create context from conversation history
      const context = conversationHistory.slice(-3).join('\n');
      
      // Create structured prompts for Flan-T5
      const prompts = this.createFlanT5Prompts(incomingMessage, context, sentiment, userPreferences);
      
      // Generate multiple response options
      const responses: string[] = [];
      
      for (const prompt of prompts) {
        const config: GenerationConfig = {
          maxTokens: userPreferences.generationConfig?.maxTokens || 80,
          temperature: userPreferences.generationConfig?.temperature || 0.7,
          topP: userPreferences.generationConfig?.topP || 0.9,
          repeatPenalty: userPreferences.generationConfig?.repeatPenalty || 1.1,
          stopSequences: userPreferences.generationConfig?.stopSequences || []
        };
        
        const response = await this.generateResponse(prompt, config);
        if (response && response.length > 10 && !responses.includes(response)) {
          responses.push(response);
        }
      }

      return responses.length > 0 ? responses : ['Thank you for your message. I\'ll get back to you soon.'];

    } catch (error) {
      this.logger.error('Failed to generate contextual response:', error);
      return ['Thank you for your message. I\'ll get back to you soon.'];
    }
  }

  /**
   * Create structured prompts optimized for Flan-T5's instruction-following capabilities
   */
  private createFlanT5Prompts(
    incomingMessage: string,
    context: string,
    sentiment: { label: string; confidence: number },
    _userPreferences: any
  ): string[] {
    const isPositive = sentiment.label === 'POSITIVE';
    const isUrgent = incomingMessage.toLowerCase().includes('urgent') || 
                    incomingMessage.toLowerCase().includes('asap');

    const prompts: string[] = [];
    
    // Professional response prompt
    let basePrompt = 'You are a professional LinkedIn user. Write a brief, professional response to this message: ';
    if (context) {
      basePrompt += `Context: ${context}\n\n`;
    }
    basePrompt += `Message: "${incomingMessage}"\n\nResponse:`;
    prompts.push(basePrompt);

    // Tone-specific prompts
    if (isPositive) {
      const enthusiasticPrompt = 'Write an enthusiastic but professional LinkedIn response to: "' + incomingMessage + '"';
      prompts.push(enthusiasticPrompt);
    }
    
    if (isUrgent) {
      const urgentPrompt = 'Write a prompt, professional response acknowledging the urgency of: "' + incomingMessage + '"';
      prompts.push(urgentPrompt);
    }

    return prompts.slice(0, 2); // Return max 2 variations to avoid redundancy
  }

  /**
   * Get model status
   */
  getModelStatus(modelId: string): 'not-loaded' | 'loading' | 'loaded' | 'error' {
    if (modelId === 'flan-t5-small') {
      const status = flanT5Pipeline.getStatus();
      if (status === 'ready') return 'loaded';
      if (status === 'loading') return 'loading';
      if (status === 'error') return 'error';
      return 'not-loaded';
    }
    
    if (this.models.has(modelId)) {
      return 'loaded';
    }
    if (this.loadingPromises.has(modelId)) {
      return 'loading';
    }
    return 'not-loaded';
  }

  /**
   * Get all model statuses
   */
  getAllModelStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {};
    for (const model of AVAILABLE_MODELS) {
      statuses[model.id] = this.getModelStatus(model.id);
    }
    return statuses;
  }

  /**
   * Unload a model to free memory
   */
  unloadModel(modelId: string): void {
    if (this.models.has(modelId)) {
      this.models.delete(modelId);
      this.logger.info(`Model ${modelId} unloaded`);
    }
  }

  /**
   * Preload commonly used models
   */
  async preloadModels(): Promise<void> {
    this.logger.info('Preloading common models...');
    
    // Initialize Flan-T5 pipeline first (primary model)
    await flanT5Pipeline.initialize();
    
    // Load sentiment analysis model
    await this.loadModel('distilbert-sentiment');
    
    this.logger.info('Model preloading completed');
  }
}
