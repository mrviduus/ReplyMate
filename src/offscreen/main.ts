/**
 * Offscreen Document Main Entry Point
 * Handles all ML initialization and inference using ONNX Runtime Web
 */

import { flanT5Pipeline } from '../worker/pipeline';
import { Logger } from '../shared/utils';

class OffscreenAIMain {
  private logger = new Logger('OffscreenAI');
  private isReady = false;
  private statusElement: HTMLElement | null = null;
  private logsElement: HTMLElement | null = null;
  private initStartTime = performance.now();

  constructor() {
    this.statusElement = document.getElementById('status');
    this.logsElement = document.getElementById('logs');
    
    this.initialize();
    this.setupMessageHandlers();
    this.setupPerformanceMonitoring();
  }

  private async initialize(): Promise<void> {
    try {
      this.log('🚀 Starting AI service initialization...');
      this.updateStatus('loading', '⏳ Loading Flan-T5-Small model...');

      // Initialize the Flan-T5 pipeline
      await flanT5Pipeline.initialize();
      
      const initTime = Math.round(performance.now() - this.initStartTime);
      this.log(`✅ Flan-T5-Small model loaded successfully in ${initTime}ms`);
      this.updateStatus('ready', '✅ ORT ready - AI models initialized');
      
      this.isReady = true;
      this.log(`📊 Total initialization completed in ${initTime}ms`);
      
      // Test model to ensure it's working
      await this.testModel();
      
    } catch (error) {
      this.logger.error('Failed to initialize AI service:', error);
      this.log(`❌ Initialization failed: ${error}`);
      this.updateStatus('error', `❌ Initialization failed: ${error}`);
    }
  }

  private async testModel(): Promise<void> {
    try {
      this.log('🧪 Testing model functionality...');
      const testResponse = await flanT5Pipeline.generate('Hello', { maxTokens: 10 });
      this.log(`✅ Model test successful: "${testResponse}"`);
    } catch (error) {
      this.log(`⚠️ Model test failed: ${error}`);
    }
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Only handle messages that are clearly meant for the offscreen document
      if (message && (message.type === 'load_model' || message.type === 'get_model_status' || 
          message.type === 'generate_response' || message.type === 'ping')) {
        this.handleMessage(message, sender)
          .then(response => sendResponse(response))
          .catch(error => {
            this.logger.error('Message handling error:', error);
            sendResponse({
              success: false,
              error: error.message || 'Unknown error'
            });
          });
        
        return true; // Keep message channel open for async response
      }
      
      // Don't handle other messages
      return false;
    });
  }

  private async handleMessage(message: any, _sender: any): Promise<any> {
    this.log(`📨 Received message: ${message.type}`);

    if (!this.isReady && message.type !== 'ping') {
      return {
        success: false,
        error: 'AI service not ready yet'
      };
    }

    try {
      switch (message.type) {
        case 'ping':
          return { success: true, data: 'pong' };

        case 'load_model':
          // Models are loaded during initialization
          return { success: true, data: { loaded: this.isReady } };

        case 'get_model_status':
          return {
            success: true,
            data: {
              'flan-t5-small': flanT5Pipeline.getStatus(),
              'distilbert-sentiment': 'not-loaded' // Sentiment analysis handled by main model
            }
          };

        case 'generate_response':
          return await this.generateResponse(message);

        default:
          this.log(`⚠️  Unknown message type: ${message.type}`);
          return { success: false, error: 'Unknown message type' };
      }
    } catch (error) {
      this.logger.error(`Error handling message ${message.type}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateResponse(message: any): Promise<any> {
    try {
      const startTime = performance.now();
      this.log(`🔄 Generating response for: "${message.message.substring(0, 50)}..."`);

      // Generate multiple responses for better variety
      const responses: string[] = [];
      const maxSuggestions = message.config?.maxSuggestions || 3;

      for (let i = 0; i < maxSuggestions; i++) {
        const response = await flanT5Pipeline.generate(message.message, {
          maxTokens: message.config?.maxTokens || 80,
          temperature: message.config?.temperature || 0.7,
          doSample: true
        });
        
        if (response && !responses.includes(response)) {
          responses.push(response);
        }
      }

      const processingTime = Math.round(performance.now() - startTime);
      this.log(`✅ Generated ${responses.length} responses in ${processingTime}ms`);

      return {
        success: true,
        data: responses
      };

    } catch (error) {
      this.logger.error('Response generation failed:', error);
      this.log(`❌ Generation failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor memory usage
    setInterval(() => {
      const perf = performance as any;
      if (perf.memory) {
        const memoryMB = Math.round(perf.memory.usedJSHeapSize / 1024 / 1024);
        if (memoryMB > 100) { // Log if memory usage exceeds 100MB
          this.log(`📊 Memory usage: ${memoryMB}MB`);
        }
      }
    }, 30000); // Check every 30 seconds

    // Monitor initialization time
    const checkInitTime = () => {
      const elapsed = performance.now() - this.initStartTime;
      if (elapsed > 3000 && !this.isReady) {
        this.log(`⚠️ Initialization taking longer than expected: ${Math.round(elapsed)}ms`);
      }
    };
    setTimeout(checkInitTime, 3000);
  }

  private updateStatus(state: 'loading' | 'ready' | 'error', message: string): void {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.className = `status ${state}`;
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString().substring(11, 23);
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    if (this.logsElement) {
      this.logsElement.textContent += logMessage + '\n';
      this.logsElement.scrollTop = this.logsElement.scrollHeight;
    }
  }
}

// Initialize offscreen AI service when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new OffscreenAIMain();
  });
} else {
  new OffscreenAIMain();
}
