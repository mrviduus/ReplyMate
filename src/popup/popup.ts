import { ExtensionSettings, UsageStats } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/constants';
import { sendMessageToBackground, Logger } from '../shared/utils';
import './popup.css';

class PopupController {
  private logger = new Logger('Popup');
  private settings: ExtensionSettings | null = null;
  private stats: UsageStats | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.logger.info('Popup initializing...');

    try {
      // Show loading state
      this.showLoading(true);

      // Load data from background
      await Promise.all([
        this.loadSettings(),
        this.loadStats(),
        this.loadModelStatus()
      ]);

      // Set up event listeners
      this.setupEventListeners();

      // Update UI
      this.updateUI();

      this.logger.info('Popup initialized');
    } catch (error) {
      this.logger.error('Failed to initialize popup:', error);
      this.showError('Failed to load extension data');
    } finally {
      this.showLoading(false);
    }
  }

  private async loadSettings(): Promise<void> {
    const response = await sendMessageToBackground({
      type: MESSAGE_TYPES.GET_SETTINGS
    });

    if (response.success) {
      this.settings = response.data;
    } else {
      throw new Error(response.error || 'Failed to load settings');
    }
  }

  private async loadStats(): Promise<void> {
    const response = await sendMessageToBackground({
      type: MESSAGE_TYPES.GET_STATS
    });

    if (response.success) {
      this.stats = response.data;
    } else {
      throw new Error(response.error || 'Failed to load stats');
    }
  }

  private async loadModelStatus(): Promise<void> {
    const response = await sendMessageToBackground({
      type: MESSAGE_TYPES.MODEL_STATUS
    });

    if (response.success) {
      this.updateModelStatus(response.data);
    } else {
      throw new Error(response.error || 'Failed to load model status');
    }
  }

  private setupEventListeners(): void {
    // Extension toggle
    const extensionToggle = document.getElementById('extensionEnabled') as HTMLInputElement;
    extensionToggle?.addEventListener('change', () => {
      this.updateSetting('isEnabled', extensionToggle.checked);
    });

    // Auto-reply toggle
    const autoReplyToggle = document.getElementById('autoReplyEnabled') as HTMLInputElement;
    autoReplyToggle?.addEventListener('change', () => {
      this.updateSetting('autoReplyEnabled', autoReplyToggle.checked);
    });

    // Model selection
    const modelSelect = document.getElementById('responseModel') as HTMLSelectElement;
    modelSelect?.addEventListener('change', () => {
      this.updateSetting('selectedModel', modelSelect.value);
    });

    // Response length
    const lengthSelect = document.getElementById('responseLength') as HTMLSelectElement;
    lengthSelect?.addEventListener('change', () => {
      const lengthMap = {
        short: 50,
        medium: 100,
        long: 200
      };
      this.updateGenerationConfig('maxTokens', lengthMap[lengthSelect.value as keyof typeof lengthMap]);
    });

    // Open options page
    const openOptionsBtn = document.getElementById('openOptions');
    openOptionsBtn?.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    // Test response
    const testBtn = document.getElementById('testResponse');
    testBtn?.addEventListener('click', () => {
      this.testResponse();
    });

    // Error toast close
    const closeToast = document.querySelector('.close-toast');
    closeToast?.addEventListener('click', () => {
      this.hideError();
    });
  }

  private async updateSetting(key: keyof ExtensionSettings, value: any): Promise<void> {
    if (!this.settings) return;

    try {
      const updatedSettings = { ...this.settings, [key]: value };
      
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        payload: updatedSettings
      });

      if (response.success) {
        this.settings = response.data;
        this.updateStatusIndicator();
        this.logger.info(`Setting ${key} updated to`, value);
      } else {
        throw new Error(response.error || 'Failed to update setting');
      }
    } catch (error) {
      this.logger.error('Failed to update setting:', error);
      this.showError('Failed to update setting');
      // Revert UI change
      this.updateUI();
    }
  }

  private async updateGenerationConfig(key: string, value: any): Promise<void> {
    if (!this.settings) return;

    const newConfig = { ...this.settings.generationConfig, [key]: value };
    await this.updateSetting('generationConfig', newConfig);
  }

  private updateUI(): void {
    if (!this.settings || !this.stats) return;

    // Update toggles
    const extensionToggle = document.getElementById('extensionEnabled') as HTMLInputElement;
    if (extensionToggle) {
      extensionToggle.checked = this.settings.isEnabled;
    }

    const autoReplyToggle = document.getElementById('autoReplyEnabled') as HTMLInputElement;
    if (autoReplyToggle) {
      autoReplyToggle.checked = this.settings.autoReplyEnabled;
    }

    // Update selects
    const modelSelect = document.getElementById('responseModel') as HTMLSelectElement;
    if (modelSelect) {
      modelSelect.value = this.settings.selectedModel;
    }

    // Update stats
    this.updateStats();

    // Update status indicator
    this.updateStatusIndicator();
  }

  private updateStats(): void {
    if (!this.stats) return;

    const totalEl = document.getElementById('totalResponses');
    if (totalEl) {
      totalEl.textContent = this.stats.totalResponses.toString();
    }

    const weeklyEl = document.getElementById('weeklyResponses');
    if (weeklyEl) {
      weeklyEl.textContent = this.stats.responsesThisWeek.toString();
    }

    const avgTimeEl = document.getElementById('avgTime');
    if (avgTimeEl) {
      avgTimeEl.textContent = `${Math.round(this.stats.averageResponseTime)}ms`;
    }
  }

  private updateStatusIndicator(): void {
    const indicator = document.getElementById('statusIndicator');
    const dot = indicator?.querySelector('.status-dot') as HTMLElement;
    const text = indicator?.querySelector('.status-text') as HTMLElement;

    if (!dot || !text || !this.settings) return;

    if (this.settings.isEnabled) {
      dot.className = 'status-dot status-active';
      text.textContent = 'Active';
    } else {
      dot.className = 'status-dot status-inactive';
      text.textContent = 'Disabled';
    }
  }

  private updateModelStatus(modelStatuses: Record<string, string>): void {
    const modelList = document.getElementById('modelList');
    if (!modelList) return;

    const modelItems = Object.entries(modelStatuses).map(([modelId, status]) => {
      const statusClass = status === 'loaded' ? 'status-loaded' : 
                         status === 'loading' ? 'status-loading' : 'status-not-loaded';
      
      const buttonText = status === 'loaded' ? 'Loaded' : 
                        status === 'loading' ? 'Loading...' : 'Load';
      
      const buttonDisabled = status === 'loading' || status === 'loaded';

      return `
        <div class="model-item">
          <div class="model-info">
            <span class="model-name">${this.getModelDisplayName(modelId)}</span>
            <span class="model-status ${statusClass}">${status}</span>
          </div>
          <div class="model-actions">
            <button 
              class="btn-secondary btn-small" 
              data-model="${modelId}"
              ${buttonDisabled ? 'disabled' : ''}
              onclick="popupController.loadModel('${modelId}')"
            >
              ${buttonText}
            </button>
          </div>
        </div>
      `;
    }).join('');

    modelList.innerHTML = modelItems;
  }

  private getModelDisplayName(modelId: string): string {
    const modelNames: Record<string, string> = {
      'phi-3-mini': 'Phi-3 Mini (Text Generation)',
      'distilbert-sentiment': 'DistilBERT (Sentiment Analysis)'
    };
    return modelNames[modelId] || modelId;
  }

  public async loadModel(modelId: string): Promise<void> {
    try {
      this.showLoading(true, `Loading ${this.getModelDisplayName(modelId)}...`);

      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.LOAD_MODEL,
        payload: { modelId }
      });

      if (response.success) {
        this.logger.info(`Model ${modelId} loaded successfully`);
        await this.loadModelStatus(); // Refresh status
      } else {
        throw new Error(response.error || 'Failed to load model');
      }
    } catch (error) {
      this.logger.error('Failed to load model:', error);
      this.showError(`Failed to load ${this.getModelDisplayName(modelId)}`);
    } finally {
      this.showLoading(false);
    }
  }

  private async testResponse(): Promise<void> {
    try {
      this.showLoading(true, 'Generating test response...');

      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.GENERATE_RESPONSE,
        payload: {
          message: 'Hi there! I hope you\'re having a great day.',
          context: [],
          conversationId: 'test'
        }
      });

      if (response.success && response.data.responses.length > 0) {
        const testResponse = response.data.responses[0];
        alert(`Test Response:\n\n"${testResponse}"\n\nGenerated in ${response.data.processingTime}ms`);
      } else {
        throw new Error(response.error || 'No response generated');
      }
    } catch (error) {
      this.logger.error('Test response failed:', error);
      this.showError('Failed to generate test response');
    } finally {
      this.showLoading(false);
    }
  }

  private showLoading(show: boolean, message = 'Loading...'): void {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;

    if (show) {
      const messageEl = overlay.querySelector('p');
      if (messageEl) {
        messageEl.textContent = message;
      }
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  }

  private showError(message: string): void {
    const toast = document.getElementById('errorToast');
    const messageEl = toast?.querySelector('.error-message');
    
    if (toast && messageEl) {
      messageEl.textContent = message;
      toast.style.display = 'block';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        this.hideError();
      }, 5000);
    }
  }

  private hideError(): void {
    const toast = document.getElementById('errorToast');
    if (toast) {
      toast.style.display = 'none';
    }
  }
}

// Create global instance
const popupController = new PopupController();

// Make it available globally for onclick handlers
(window as any).popupController = popupController;
