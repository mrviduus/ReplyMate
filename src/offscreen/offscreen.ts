import { flanT5Pipeline } from '../worker/pipeline';
import { Logger } from '../shared/utils';

class OffscreenAIService {
  private logger = new Logger('OffscreenAI');
  private isReady = false;
  private statusElement: HTMLElement | null = null;
  private logsElement: HTMLElement | null = null;

  constructor() {
    this.statusElement = document.getElementById('status');
    this.logsElement = document.getElementById('logs');
    
    this.initialize();
    this.setupMessageHandlers();
  }

  private async initialize(): Promise<void> {
    try {
      this.log('🚀 Starting AI service initialization...');
      this.updateStatus('loading', '⏳ Loading Flan-T5-Small model...');

      // Initialize the Flan-T5 pipeline
      await flanT5Pipeline.initialize();
      
      this.log('✅ Flan-T5-Small model loaded successfully');
      this.updateStatus('ready', '✅ ORT ready - AI models initialized');
      
      this.isReady = true;
      this.log(`📊 Initialization completed in ${Date.now() - performance.timeOrigin}ms`);
      
    } catch (error) {
      this.logger.error('Failed to initialize AI service:', error);
      this.log(`❌ Initialization failed: ${error}`);
      this.updateStatus('error', `❌ Initialization failed: ${error}`);
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
      const startTime = Date.now();
      this.log(`🧠 Generating response for: "${message.message?.substring(0, 50)}..."`);

      // Create professional LinkedIn prompt
      const prompt = `You are a professional LinkedIn user. Write a brief, professional response to this message: "${message.message}"

Response:`;

      const response = await flanT5Pipeline.generate(prompt, {
        maxTokens: message.config?.maxTokens || 80,
        temperature: message.config?.temperature || 0.7
      });

      const processingTime = Date.now() - startTime;
      this.log(`✅ Response generated in ${processingTime}ms: "${response}"`);

      return {
        success: true,
        data: [response], // Return array for compatibility
        processingTime
      };

    } catch (error) {
      this.logger.error('Response generation failed:', error);
      this.log(`❌ Response generation failed: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private updateStatus(type: 'loading' | 'ready' | 'error', message: string): void {
    if (this.statusElement) {
      this.statusElement.className = `status ${type}`;
      this.statusElement.textContent = message;
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    
    console.log(logMessage);
    
    if (this.logsElement) {
      this.logsElement.textContent += logMessage + '\n';
      this.logsElement.scrollTop = this.logsElement.scrollHeight;
    }
  }
}

// Initialize the offscreen AI service when the document loads
document.addEventListener('DOMContentLoaded', () => {
  new OffscreenAIService();
});

// Also initialize immediately if document is already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new OffscreenAIService();
  });
} else {
  new OffscreenAIService();
}
