/**
 * Clean Service Worker Entry Point
 * No DOM references, delegates AI operations to offscreen document
 */

import { Message, MessageResponse, ExtensionSettings, UsageStats, LogEntry } from '../shared/types';
import { MESSAGE_TYPES, STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/constants';
import { StorageManager, Logger } from '../shared/utils';

class ServiceWorker {
  private logger = new Logger('ServiceWorker');
  private settings: ExtensionSettings = DEFAULT_SETTINGS;
  private stats: UsageStats = {
    totalResponses: 0,
    responsesThisWeek: 0,
    responsesThisMonth: 0,
    averageResponseTime: 0,
    mostUsedTemplates: [],
    lastUsed: new Date(),
    totalTokensGenerated: 0,
    modelSwitches: 0
  };
  private offscreenReady = false;
  private hasOffscreenAPI = false;

  constructor() {
    this.initializeServiceWorker();
  }

  private async initializeServiceWorker(): Promise<void> {
    this.logger.info('Service Worker initializing...');

    // Check for offscreen API availability
    this.hasOffscreenAPI = !!(chrome?.offscreen?.createDocument);
    this.logger.info(`Offscreen API available: ${this.hasOffscreenAPI}`);

    // Load settings and stats from storage
    await this.loadSettings();
    await this.loadStats();

    // Set up message listeners
    this.setupMessageListeners();

    // Set up alarm for weekly stats reset
    this.setupWeeklyStatsReset();

    // Initialize AI processing context
    if (this.settings.isEnabled) {
      this.initializeAIContext().catch((error: any) => {
        this.logger.error('Failed to initialize AI context:', error);
      });
    }

    this.logger.info('Service Worker initialized');
  }

  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse) => {
        this.handleMessage(message, sender)
          .then(response => sendResponse(response))
          .catch(error => {
            this.logger.error('Message handling error:', error);
            sendResponse({
              success: false,
              error: error.message || 'Unknown error',
              requestId: message.requestId
            });
          });
        
        return true; // Keep message channel open for async response
      }
    );
  }

  private async handleMessage(
    message: Message,
    _sender: chrome.runtime.MessageSender
  ): Promise<MessageResponse> {
    const { type, payload, requestId } = message;

    try {
      switch (type) {
        case MESSAGE_TYPES.PING:
          return { success: true, data: 'pong', requestId };

        case MESSAGE_TYPES.GET_SETTINGS:
          return { success: true, data: this.settings, requestId };

        case MESSAGE_TYPES.UPDATE_SETTINGS:
          await this.updateSettings(payload);
          return { success: true, data: this.settings, requestId };

        case MESSAGE_TYPES.LOAD_MODEL:
          const loaded = await this.sendToAIContext({ type: 'load_model', modelId: payload.modelId });
          return { success: loaded.success, data: { loaded: loaded.success }, requestId };

        case MESSAGE_TYPES.MODEL_STATUS:
          const statuses = await this.sendToAIContext({ type: 'get_model_status' });
          return { success: true, data: statuses.data || {}, requestId };

        case MESSAGE_TYPES.GENERATE_RESPONSE:
          const response = await this.generateResponse(payload);
          return { success: true, data: response, requestId };

        case MESSAGE_TYPES.LOG_USAGE:
          await this.logUsage(payload);
          return { success: true, requestId };

        case MESSAGE_TYPES.GET_STATS:
          return { success: true, data: this.stats, requestId };

        default:
          this.logger.warn('Unknown message type:', type);
          return { success: false, error: 'Unknown message type', requestId };
      }
    } catch (error) {
      this.logger.error(`Error handling message ${type}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId
      };
    }
  }

  private async generateResponse(payload: {
    message: string;
    context?: string[];
    conversationId?: string;
  }): Promise<{ responses: string[]; processingTime: number }> {
    const startTime = Date.now();
    
    try {
      if (!this.settings.isEnabled) {
        throw new Error('Extension is disabled');
      }

      const responses = await this.sendToAIContext({
        type: 'generate_response',
        message: payload.message,
        context: payload.context || [],
        config: this.settings.generationConfig
      });

      const processingTime = Date.now() - startTime;

      // Update usage stats
      this.stats.totalResponses++;
      this.stats.responsesThisWeek++;
      this.stats.averageResponseTime = 
        (this.stats.averageResponseTime + processingTime) / 2;
      this.stats.lastUsed = new Date();

      await this.saveStats();

      return { responses: responses.data || [], processingTime };

    } catch (error) {
      this.logger.error('Response generation failed:', error);
      throw error;
    }
  }

  private async initializeAIContext(): Promise<void> {
    if (this.hasOffscreenAPI) {
      await this.initializeOffscreenDocument();
    } else {
      this.logger.warn('Offscreen API not available, using fallback approach');
      // For browsers without offscreen API, we could use other approaches
      // like background scripts with isolated contexts or web workers
      this.offscreenReady = true; // Mark as ready for fallback
    }
  }

  private async initializeOffscreenDocument(): Promise<void> {
    try {
      // Check if offscreen API is available
      if (!chrome.offscreen) {
        throw new Error('Offscreen API not available');
      }

      // Create offscreen document for AI processing
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: [chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'AI model initialization and inference using ONNX Runtime Web'
      });
      
      this.logger.info('Offscreen document created for AI processing');
      this.offscreenReady = true;
    } catch (error: any) {
      // Document might already exist
      if (error.message?.includes('Only a single offscreen')) {
        this.logger.info('Offscreen document already exists');
        this.offscreenReady = true;
      } else {
        this.logger.error('Failed to create offscreen document:', error);
        // Don't throw here - let the fallback handle it
        this.hasOffscreenAPI = false;
      }
    }
  }

  private async sendToAIContext(message: any): Promise<any> {
    try {
      if (!this.offscreenReady) {
        await this.initializeAIContext();
      }

      if (this.hasOffscreenAPI) {
        return this.sendToOffscreen(message);
      } else {
        return this.sendToFallback(message);
      }
    } catch (error) {
      this.logger.error('Failed to send message to AI context:', error);
      throw error;
    }
  }

  private async sendToOffscreen(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Offscreen message timeout'));
      }, 30000); // 30 second timeout

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error('No response received from offscreen document'));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private async sendToFallback(_message: any): Promise<any> {
    // Fallback for browsers without offscreen API
    this.logger.warn('Using fallback AI processing (limited functionality)');
    
    // Return a helpful message indicating the limitation
    return {
      success: false,
      error: 'AI processing requires Chrome 109+ or Edge 109+ with offscreen document support',
      data: []
    };
  }

  private async loadSettings(): Promise<void> {
    try {
      const stored = await StorageManager.get<ExtensionSettings>(
        STORAGE_KEYS.SETTINGS,
        DEFAULT_SETTINGS
      );
      this.settings = { ...DEFAULT_SETTINGS, ...stored };
      this.logger.info('Settings loaded');
    } catch (error) {
      this.logger.error('Failed to load settings:', error);
      this.settings = DEFAULT_SETTINGS;
    }
  }

  private async updateSettings(newSettings: Partial<ExtensionSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    await StorageManager.set(STORAGE_KEYS.SETTINGS, this.settings);
    this.logger.info('Settings updated');

    // Reload AI context if needed
    if (newSettings.isEnabled && !this.offscreenReady) {
      this.initializeAIContext().catch((error: any) => {
        this.logger.error('Failed to initialize AI context after settings update:', error);
      });
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const stored = await StorageManager.get<UsageStats>(
        STORAGE_KEYS.USAGE_STATS,
        this.stats
      );
      this.stats = stored;
      
      // Reset weekly stats if a week has passed
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      if (this.stats.lastUsed < weekAgo) {
        this.stats.responsesThisWeek = 0;
      }
      
      this.logger.info('Stats loaded');
    } catch (error) {
      this.logger.error('Failed to load stats:', error);
    }
  }

  private async saveStats(): Promise<void> {
    try {
      await StorageManager.set(STORAGE_KEYS.USAGE_STATS, this.stats);
    } catch (error) {
      this.logger.error('Failed to save stats:', error);
    }
  }

  private async logUsage(logEntry: LogEntry): Promise<void> {
    // Store logs for debugging and analytics
    const logs = await StorageManager.get<LogEntry[]>('debug_logs', []);
    logs.push(logEntry);
    
    // Keep only last 1000 log entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    await StorageManager.set('debug_logs', logs);
  }

  private setupWeeklyStatsReset(): void {
    // Create alarm for weekly stats reset
    chrome.alarms.create('weeklyStatsReset', {
      when: this.getNextWeeklyResetTime(),
      periodInMinutes: 7 * 24 * 60 // Weekly
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'weeklyStatsReset') {
        this.stats.responsesThisWeek = 0;
        this.saveStats();
        this.logger.info('Weekly stats reset');
      }
    });
  }

  private getNextWeeklyResetTime(): number {
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(now.getDate() + (7 - now.getDay() + 1) % 7);
    nextMonday.setHours(0, 0, 0, 0);
    return nextMonday.getTime();
  }
}

// Initialize service worker
new ServiceWorker();
