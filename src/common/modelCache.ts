/**
 * Model Cache Manager
 * Handles caching of TinyLlama model weights in chrome.storage.local
 */

export interface ModelShard {
  url: string;
  data: ArrayBuffer;
  size: number;
  checksum?: string;
}

export interface CacheEntry {
  shards: ModelShard[];
  timestamp: number;
  version: string;
  totalSize: number;
}

export interface DownloadProgress {
  shardIndex: number;
  totalShards: number;
  shardProgress: number;
  totalProgress: number;
  currentShardUrl: string;
  bytesLoaded: number;
  totalBytes: number;
}

export class ModelCacheManager {
  private readonly cacheKey = 'tinyllama_model_cache';
  private readonly maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  private readonly modelVersion = '1.0.0';

  /**
   * Checks if model is cached and valid
   */
  async isCached(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const cache = result[this.cacheKey] as CacheEntry;
      
      if (!cache) {
        return false;
      }

      // Check if cache is expired
      const now = Date.now();
      if (now - cache.timestamp > this.maxCacheAge) {
        console.log('Model cache expired, will re-download');
        await this.clearCache();
        return false;
      }

      // Check if version matches
      if (cache.version !== this.modelVersion) {
        console.log('Model version mismatch, will re-download');
        await this.clearCache();
        return false;
      }

      // Verify all shards exist
      if (!cache.shards || cache.shards.length === 0) {
        return false;
      }

      console.log(`Model cache found: ${cache.shards.length} shards, ${this.formatBytes(cache.totalSize)}`);
      return true;
    } catch (error) {
      console.error('Error checking model cache:', error);
      return false;
    }
  }

  /**
   * Gets cached model shards
   */
  async getCachedModel(): Promise<ModelShard[]> {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const cache = result[this.cacheKey] as CacheEntry;
      
      if (!cache || !cache.shards) {
        throw new Error('No cached model found');
      }

      return cache.shards;
    } catch (error) {
      console.error('Error retrieving cached model:', error);
      throw error;
    }
  }

  /**
   * Downloads and caches model shards with progress tracking
   */
  async downloadAndCache(
    shardUrls: string[],
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<ModelShard[]> {
    const shards: ModelShard[] = [];
    let totalBytesLoaded = 0;
    let totalBytes = 0;

    // First pass: get total size for accurate progress
    console.log('Getting shard sizes...');
    const shardSizes: number[] = [];
    for (let i = 0; i < shardUrls.length; i++) {
      try {
        const response = await fetch(shardUrls[i], { method: 'HEAD' });
        const size = parseInt(response.headers.get('content-length') || '0');
        shardSizes.push(size);
        totalBytes += size;
      } catch (error) {
        console.warn(`Could not get size for shard ${i}:`, error);
        shardSizes.push(0);
      }
    }

    console.log(`Starting download of ${shardUrls.length} shards (${this.formatBytes(totalBytes)})`);

    // Download each shard
    for (let i = 0; i < shardUrls.length; i++) {
      const url = shardUrls[i];
      const expectedSize = shardSizes[i];
      
      try {
        console.log(`Downloading shard ${i + 1}/${shardUrls.length}: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body reader available');
        }

        const chunks: Uint8Array[] = [];
        let shardBytesLoaded = 0;

        // Stream the response
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          chunks.push(value);
          shardBytesLoaded += value.length;
          totalBytesLoaded += value.length;

          // Report progress
          if (onProgress) {
            const shardProgress = expectedSize > 0 ? (shardBytesLoaded / expectedSize) * 100 : 0;
            const totalProgress = totalBytes > 0 ? (totalBytesLoaded / totalBytes) * 100 : 0;
            
            onProgress({
              shardIndex: i,
              totalShards: shardUrls.length,
              shardProgress,
              totalProgress,
              currentShardUrl: url,
              bytesLoaded: shardBytesLoaded,
              totalBytes: expectedSize
            });
          }
        }

        // Combine chunks into ArrayBuffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        const shard: ModelShard = {
          url,
          data: combined.buffer,
          size: totalLength
        };

        shards.push(shard);
        console.log(`Shard ${i + 1} downloaded: ${this.formatBytes(totalLength)}`);

      } catch (error) {
        console.error(`Failed to download shard ${i + 1}:`, error);
        throw new Error(`Failed to download model shard: ${error}`);
      }
    }

    // Cache the model
    await this.cacheModel(shards);
    
    console.log(`Model download complete: ${shards.length} shards, ${this.formatBytes(totalBytesLoaded)}`);
    return shards;
  }

  /**
   * Caches model shards to chrome.storage.local
   */
  async cacheModel(shards: ModelShard[]): Promise<void> {
    try {
      const totalSize = shards.reduce((sum, shard) => sum + shard.size, 0);
      
      const cacheEntry: CacheEntry = {
        shards,
        timestamp: Date.now(),
        version: this.modelVersion,
        totalSize
      };

      await chrome.storage.local.set({
        [this.cacheKey]: cacheEntry
      });

      console.log(`Model cached successfully: ${this.formatBytes(totalSize)}`);
    } catch (error) {
      console.error('Failed to cache model:', error);
      throw error;
    }
  }

  /**
   * Clears the model cache
   */
  async clearCache(): Promise<void> {
    try {
      await chrome.storage.local.remove(this.cacheKey);
      console.log('Model cache cleared');
    } catch (error) {
      console.error('Failed to clear model cache:', error);
      throw error;
    }
  }

  /**
   * Gets cache info for display
   */
  async getCacheInfo(): Promise<{ cached: boolean; size?: string; timestamp?: Date } | null> {
    try {
      const result = await chrome.storage.local.get(this.cacheKey);
      const cache = result[this.cacheKey] as CacheEntry;
      
      if (!cache) {
        return { cached: false };
      }

      return {
        cached: true,
        size: this.formatBytes(cache.totalSize),
        timestamp: new Date(cache.timestamp)
      };
    } catch (error) {
      console.error('Error getting cache info:', error);
      return null;
    }
  }

  /**
   * Formats byte size for display
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// Global instance
export const modelCacheManager = new ModelCacheManager();
