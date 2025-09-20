import { CreateMLCEngine, MLCEngineInterface, InitProgressReport } from "@mlc-ai/web-llm";

export interface ModelLoadingConfig {
  modelId: string;
  priority: 'high' | 'medium' | 'low';
  maxRetries: number;
  timeoutMs: number;
  preload: boolean;
}

export interface ModelLoadingState {
  isLoading: boolean;
  progress: number;
  progressText: string;
  error: string | null;
  attemptNumber: number;
}

export class OptimizedModelLoader {
  private static instance: OptimizedModelLoader | null = null;
  private engines: Map<string, MLCEngineInterface> = new Map();
  private loadingStates: Map<string, ModelLoadingState> = new Map();
  private preloadQueue: string[] = [];
  private currentlyLoading: Set<string> = new Set();

  private readonly MODEL_PRIORITIES: Record<string, string> = {
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC': 'high',
    'Phi-3.5-mini-instruct-q4f16_1-MLC': 'high',
    'gemma-2-2b-it-q4f16_1-MLC': 'medium',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC': 'medium',
    'Llama-3.2-3B-Instruct-q4f16_1-MLC': 'low'
  };

  private constructor() {
    this.initializePreloading();
  }

  static getInstance(): OptimizedModelLoader {
    if (!OptimizedModelLoader.instance) {
      OptimizedModelLoader.instance = new OptimizedModelLoader();
    }
    return OptimizedModelLoader.instance;
  }

  private async initializePreloading(): Promise<void> {
    const highPriorityModels = Object.entries(this.MODEL_PRIORITIES)
      .filter(([_, priority]) => priority === 'high')
      .map(([model]) => model);

    for (const model of highPriorityModels) {
      this.preloadQueue.push(model);
    }

    this.processPreloadQueue();
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.preloadQueue.length === 0) return;

    const nextModel = this.preloadQueue.shift();
    if (nextModel && !this.engines.has(nextModel)) {
      try {
        console.log(`📦 Preloading model: ${nextModel}`);
        await this.preloadModel(nextModel);
      } catch (error) {
        console.warn(`⚠️ Failed to preload ${nextModel}:`, error);
      }
    }

    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processPreloadQueue(), 5000);
    }
  }

  private async preloadModel(modelId: string): Promise<void> {
    try {
      const cacheKey = `model_cache_${modelId}`;
      const cached = await this.getCachedModelMetadata(cacheKey);

      if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        console.log(`✨ Using cached metadata for ${modelId}`);
        return;
      }

      // Preloading would happen here if WebLLM supported it
      console.log(`📦 Model ${modelId} marked for priority loading`);

      await this.setCachedModelMetadata(cacheKey, {
        modelId,
        timestamp: Date.now(),
        preloaded: true
      });
    } catch (error) {
      console.warn(`Preload failed for ${modelId}:`, error);
    }
  }

  private async getCachedModelMetadata(key: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key] || null);
      });
    });
  }

  private async setCachedModelMetadata(key: string, data: any): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: data }, resolve);
    });
  }

  async loadModel(
    modelId: string,
    progressCallback?: (state: ModelLoadingState) => void,
    config?: Partial<ModelLoadingConfig>
  ): Promise<MLCEngineInterface> {
    if (this.engines.has(modelId)) {
      console.log(`♻️ Reusing cached engine for ${modelId}`);
      return this.engines.get(modelId)!;
    }

    if (this.currentlyLoading.has(modelId)) {
      console.log(`⏳ Model ${modelId} already loading, waiting...`);
      return this.waitForLoading(modelId);
    }

    const loadingConfig: ModelLoadingConfig = {
      modelId,
      priority: (this.MODEL_PRIORITIES[modelId] || 'medium') as any,
      maxRetries: config?.maxRetries || 3,
      timeoutMs: config?.timeoutMs || 120000,
      preload: config?.preload || false,
      ...config
    };

    return this.loadWithRetry(loadingConfig, progressCallback);
  }

  private async waitForLoading(modelId: string): Promise<MLCEngineInterface> {
    const maxWait = 60000;
    const checkInterval = 500;
    let waited = 0;

    while (this.currentlyLoading.has(modelId) && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (this.engines.has(modelId)) {
      return this.engines.get(modelId)!;
    }

    throw new Error(`Model ${modelId} loading timed out`);
  }

  private async loadWithRetry(
    config: ModelLoadingConfig,
    progressCallback?: (state: ModelLoadingState) => void
  ): Promise<MLCEngineInterface> {
    const { modelId, maxRetries, timeoutMs } = config;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.currentlyLoading.add(modelId);

        const state: ModelLoadingState = {
          isLoading: true,
          progress: 0,
          progressText: `Loading ${modelId} (attempt ${attempt}/${maxRetries})`,
          error: null,
          attemptNumber: attempt
        };

        this.loadingStates.set(modelId, state);
        progressCallback?.(state);

        const engine = await this.createEngineWithTimeout(
          modelId,
          timeoutMs,
          (report) => {
            const updatedState = {
              ...state,
              progress: report.progress,
              progressText: report.text
            };
            this.loadingStates.set(modelId, updatedState);
            progressCallback?.(updatedState);
          }
        );

        this.engines.set(modelId, engine);
        this.currentlyLoading.delete(modelId);

        const successState: ModelLoadingState = {
          isLoading: false,
          progress: 1,
          progressText: 'Model loaded successfully',
          error: null,
          attemptNumber: attempt
        };

        this.loadingStates.set(modelId, successState);
        progressCallback?.(successState);

        await this.performHealthCheck(engine, modelId);

        return engine;
      } catch (error) {
        lastError = error as Error;
        this.currentlyLoading.delete(modelId);

        const errorState: ModelLoadingState = {
          isLoading: false,
          progress: 0,
          progressText: `Failed: ${lastError.message}`,
          error: lastError.message,
          attemptNumber: attempt
        };

        this.loadingStates.set(modelId, errorState);
        progressCallback?.(errorState);

        if (attempt < maxRetries) {
          console.log(`🔄 Retrying ${modelId} in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    throw lastError || new Error(`Failed to load ${modelId} after ${maxRetries} attempts`);
  }

  private async createEngineWithTimeout(
    modelId: string,
    timeoutMs: number,
    progressCallback: (report: InitProgressReport) => void
  ): Promise<MLCEngineInterface> {
    const enginePromise = CreateMLCEngine(modelId, {
      initProgressCallback: progressCallback
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout loading ${modelId}`)), timeoutMs)
    );

    return Promise.race([enginePromise, timeoutPromise]);
  }

  private async performHealthCheck(engine: MLCEngineInterface, modelId: string): Promise<void> {
    try {
      console.log(`🏥 Performing health check for ${modelId}`);

      const testMessage = [{
        role: "user" as const,
        content: "Hello"
      }];

      const reply = await engine.chat.completions.create({
        messages: testMessage,
        max_tokens: 10,
        temperature: 0.5
      });

      if (!reply.choices[0]?.message?.content) {
        throw new Error('Health check failed: No response');
      }

      console.log(`✅ Health check passed for ${modelId}`);
    } catch (error) {
      console.error(`❌ Health check failed for ${modelId}:`, error);
      this.engines.delete(modelId);
      throw error;
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    const engine = this.engines.get(modelId);
    if (engine) {
      try {
        await engine.unload();
        this.engines.delete(modelId);
        this.loadingStates.delete(modelId);
        console.log(`🗑️ Unloaded model ${modelId}`);
      } catch (error) {
        console.error(`Failed to unload ${modelId}:`, error);
      }
    }
  }

  async unloadAllModels(): Promise<void> {
    const unloadPromises = Array.from(this.engines.keys()).map(modelId =>
      this.unloadModel(modelId)
    );
    await Promise.all(unloadPromises);
  }

  getLoadedModels(): string[] {
    return Array.from(this.engines.keys());
  }

  getLoadingState(modelId: string): ModelLoadingState | null {
    return this.loadingStates.get(modelId) || null;
  }

  async getOptimalModel(): Promise<string> {
    const memoryInfo = await this.getMemoryInfo();
    const { totalJSHeapSize, usedJSHeapSize } = memoryInfo;
    const availableMemory = totalJSHeapSize - usedJSHeapSize;

    if (availableMemory < 500 * 1024 * 1024) {
      return 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
    } else if (availableMemory < 1024 * 1024 * 1024) {
      return 'Phi-3.5-mini-instruct-q4f16_1-MLC';
    } else if (availableMemory < 2048 * 1024 * 1024) {
      return 'gemma-2-2b-it-q4f16_1-MLC';
    } else {
      return 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    }
  }

  private async getMemoryInfo(): Promise<any> {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return {
      totalJSHeapSize: 2048 * 1024 * 1024,
      usedJSHeapSize: 1024 * 1024 * 1024
    };
  }
}

export default OptimizedModelLoader;