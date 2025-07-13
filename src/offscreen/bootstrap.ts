import { Logger } from '../shared/utils';

interface ModelWeights {
  modelPath: string;
  size: number;
  cached: boolean;
  lastAccessed: Date;
}

/**
 * Bootstrap class for managing model weights in IndexedDB
 * Handles caching of ONNX models for offline usage
 */
export class ModelBootstrap {
  private logger = new Logger('ModelBootstrap');
  private dbName = 'linkedin-autoreply-models';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        this.logger.error('Failed to open IndexedDB');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.logger.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for model weights
        if (!db.objectStoreNames.contains('weights')) {
          const store = db.createObjectStore('weights', { keyPath: 'modelPath' });
          store.createIndex('lastAccessed', 'lastAccessed');
          store.createIndex('size', 'size');
        }

        this.logger.info('IndexedDB schema updated');
      };
    });
  }

  /**
   * Cache model weights in IndexedDB for faster subsequent loads
   */
  async cacheWeights(modelPath: string): Promise<void> {
    try {
      this.logger.info(`Starting cache process for model: ${modelPath}`);
      
      // Check if already cached
      const existing = await this.getWeightInfo(modelPath);
      if (existing && existing.cached) {
        this.logger.info(`Model ${modelPath} already cached`);
        return;
      }

      // Download and cache model weights
      await this.downloadAndCache(modelPath);
      
      this.logger.info(`Successfully cached model: ${modelPath}`);
    } catch (error) {
      this.logger.error(`Failed to cache weights for ${modelPath}:`, error);
      throw error;
    }
  }

  private async downloadAndCache(modelPath: string): Promise<void> {
    try {
      // Use dynamic import to load the model with Transformers.js
      const { pipeline } = await import('@huggingface/transformers');
      
      // Initialize the pipeline which automatically downloads and caches the model
      const modelPipeline = await pipeline('text2text-generation', 'Xenova/flan-t5-small', {
        revision: 'main'
      });

      // Store metadata in IndexedDB
      const weightInfo: ModelWeights = {
        modelPath,
        size: await this.estimateModelSize(),
        cached: true,
        lastAccessed: new Date()
      };

      await this.storeWeightInfo(weightInfo);
      
      this.logger.info(`Model ${modelPath} downloaded and cached successfully`);
      
      // Cleanup pipeline reference
      if (modelPipeline && typeof modelPipeline.dispose === 'function') {
        modelPipeline.dispose();
      }
      
    } catch (error) {
      this.logger.error(`Failed to download model ${modelPath}:`, error);
      throw error;
    }
  }

  private async estimateModelSize(): Promise<number> {
    // Estimate size for Flan-T5-Small int8 (~60MB)
    return 60 * 1024 * 1024; // 60MB in bytes
  }

  private async storeWeightInfo(weightInfo: ModelWeights): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['weights'], 'readwrite');
      const store = transaction.objectStore('weights');
      const request = store.put(weightInfo);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getWeightInfo(modelPath: string): Promise<ModelWeights | null> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['weights'], 'readonly');
      const store = transaction.objectStore('weights');
      const request = store.get(modelPath);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalSize: number; modelCount: number; models: ModelWeights[] }> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['weights'], 'readonly');
      const store = transaction.objectStore('weights');
      const request = store.getAll();

      request.onsuccess = () => {
        const models: ModelWeights[] = request.result;
        const totalSize = models.reduce((sum, model) => sum + model.size, 0);
        
        resolve({
          totalSize,
          modelCount: models.length,
          models
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached models
   */
  async clearCache(): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['weights'], 'readwrite');
      const store = transaction.objectStore('weights');
      const request = store.clear();

      request.onsuccess = () => {
        this.logger.info('Model cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Bootstrap function for first run
export async function bootstrapModels(): Promise<void> {
  const bootstrap = new ModelBootstrap();
  
  // Cache the Flan-T5-Small model on first run
  await bootstrap.cacheWeights('models/flan-t5-small/onnx/int8');
}
