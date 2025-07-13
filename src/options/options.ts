import { ExtensionSettings, UsageStats, MessageTemplate } from '../shared/types';
import { MESSAGE_TYPES } from '../shared/constants';
import { sendMessageToBackground, Logger } from '../shared/utils';
import './options.css';

class OptionsController {
  private logger = new Logger('Options');
  private settings: ExtensionSettings | null = null;
  private stats: UsageStats | null = null;
  private templates: MessageTemplate[] = [];
  private currentEditingTemplate: MessageTemplate | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.logger.info('Options page initializing...');

    try {
      this.showLoading(true);

      // Load data from background
      await Promise.all([
        this.loadSettings(),
        this.loadStats(),
        this.loadTemplates()
      ]);

      // Set up navigation
      this.setupNavigation();

      // Set up event listeners
      this.setupEventListeners();

      // Update UI
      this.updateUI();

      // Load initial section
      this.showSection('general');

      this.logger.info('Options page initialized');
    } catch (error) {
      this.logger.error('Failed to initialize options:', error);
      this.showNotification('Failed to load extension data', 'error');
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

  private async loadTemplates(): Promise<void> {
    const response = await sendMessageToBackground({
      type: MESSAGE_TYPES.GET_TEMPLATES
    });

    if (response.success) {
      this.templates = response.data || [];
    } else {
      this.logger.warn('Failed to load templates, using empty array');
      this.templates = [];
    }
  }

  private setupNavigation(): void {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.getAttribute('data-section');
        if (sectionId) {
          this.showSection(sectionId);
          this.updateActiveNav(item);
        }
      });
    });
  }

  private setupEventListeners(): void {
    // General settings
    this.setupGeneralListeners();
    
    // AI model settings
    this.setupModelListeners();
    
    // Template management
    this.setupTemplateListeners();
    
    // Privacy settings
    this.setupPrivacyListeners();
    
    // Import/Export
    this.setupImportExportListeners();
  }

  private setupGeneralListeners(): void {
    // Extension enabled
    const extensionEnabled = document.getElementById('extensionEnabled') as HTMLInputElement;
    extensionEnabled?.addEventListener('change', () => {
      this.updateSetting('isEnabled', extensionEnabled.checked);
    });

    // Auto-reply enabled
    const autoReplyEnabled = document.getElementById('autoReplyEnabled') as HTMLInputElement;
    autoReplyEnabled?.addEventListener('change', () => {
      this.updateSetting('autoReplyEnabled', autoReplyEnabled.checked);
    });

    // Suggestion mode
    const suggestionMode = document.getElementById('suggestionMode') as HTMLSelectElement;
    suggestionMode?.addEventListener('change', () => {
      this.updateSetting('suggestionMode', suggestionMode.value as 'automatic' | 'manual');
    });

    // Response delay
    const responseDelay = document.getElementById('responseDelay') as HTMLInputElement;
    responseDelay?.addEventListener('input', () => {
      this.updateSetting('responseDelay', parseInt(responseDelay.value));
    });

    // Response language
    const responseLanguage = document.getElementById('responseLanguage') as HTMLSelectElement;
    responseLanguage?.addEventListener('change', () => {
      this.updateSetting('responseLanguage', responseLanguage.value);
    });
  }

  private setupModelListeners(): void {
    // Selected model
    const selectedModel = document.getElementById('selectedModel') as HTMLSelectElement;
    selectedModel?.addEventListener('change', () => {
      this.updateSetting('selectedModel', selectedModel.value);
    });

    // Generation config sliders
    const maxTokens = document.getElementById('maxTokens') as HTMLInputElement;
    maxTokens?.addEventListener('input', () => {
      this.updateGenerationConfig('maxTokens', parseInt(maxTokens.value));
      this.updateSliderValue('maxTokens', maxTokens.value);
    });

    const temperature = document.getElementById('temperature') as HTMLInputElement;
    temperature?.addEventListener('input', () => {
      this.updateGenerationConfig('temperature', parseFloat(temperature.value));
      this.updateSliderValue('temperature', temperature.value);
    });

    const topP = document.getElementById('topP') as HTMLInputElement;
    topP?.addEventListener('input', () => {
      this.updateGenerationConfig('topP', parseFloat(topP.value));
      this.updateSliderValue('topP', topP.value);
    });

    // Model management buttons
    const loadModelsBtn = document.getElementById('loadModels');
    loadModelsBtn?.addEventListener('click', () => {
      this.loadAllModels();
    });

    const clearCacheBtn = document.getElementById('clearCache');
    clearCacheBtn?.addEventListener('click', () => {
      this.clearModelCache();
    });
  }

  private setupTemplateListeners(): void {
    // Add template button
    const addTemplateBtn = document.getElementById('addTemplate');
    addTemplateBtn?.addEventListener('click', () => {
      this.showTemplateEditor();
    });

    // Template form
    const templateForm = document.getElementById('templateForm') as HTMLFormElement;
    templateForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTemplate();
    });

    // Cancel template editing
    const cancelTemplateBtn = document.getElementById('cancelTemplate');
    cancelTemplateBtn?.addEventListener('click', () => {
      this.hideTemplateEditor();
    });
  }

  private setupPrivacyListeners(): void {
    // Analytics enabled
    const analyticsEnabled = document.getElementById('analyticsEnabled') as HTMLInputElement;
    analyticsEnabled?.addEventListener('change', () => {
      this.updateSetting('analyticsEnabled', analyticsEnabled.checked);
    });

    // Data sharing
    const dataSharing = document.getElementById('dataSharing') as HTMLInputElement;
    dataSharing?.addEventListener('change', () => {
      this.updateSetting('dataSharing', dataSharing.checked);
    });

    // Clear data button
    const clearDataBtn = document.getElementById('clearData');
    clearDataBtn?.addEventListener('click', () => {
      this.clearAllData();
    });
  }

  private setupImportExportListeners(): void {
    // Export settings
    const exportBtn = document.getElementById('exportSettings');
    exportBtn?.addEventListener('click', () => {
      this.exportSettings();
    });

    // Import settings
    const importInput = document.getElementById('importSettings') as HTMLInputElement;
    importInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.importSettings(file);
      }
    });

    // Reset to defaults
    const resetBtn = document.getElementById('resetDefaults');
    resetBtn?.addEventListener('click', () => {
      this.resetToDefaults();
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
        this.showNotification('Settings updated successfully', 'success');
        this.logger.info(`Setting ${key} updated to`, value);
      } else {
        throw new Error(response.error || 'Failed to update setting');
      }
    } catch (error) {
      this.logger.error('Failed to update setting:', error);
      this.showNotification('Failed to update setting', 'error');
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
    if (!this.settings) return;

    this.updateGeneralSection();
    this.updateModelSection();
    this.updateTemplateSection();
    this.updatePrivacySection();
    this.updateAnalyticsSection();
  }

  private updateGeneralSection(): void {
    if (!this.settings) return;

    const elements = {
      extensionEnabled: this.settings.isEnabled,
      autoReplyEnabled: this.settings.autoReplyEnabled,
      suggestionMode: this.settings.suggestionMode,
      responseDelay: this.settings.responseDelay,
      responseLanguage: this.settings.responseLanguage
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
      if (element) {
        if (element.type === 'checkbox') {
          (element as HTMLInputElement).checked = value as boolean;
        } else {
          element.value = value as string;
        }
      }
    });
  }

  private updateModelSection(): void {
    if (!this.settings) return;

    const selectedModel = document.getElementById('selectedModel') as HTMLSelectElement;
    if (selectedModel) {
      selectedModel.value = this.settings.selectedModel;
    }

    const config = this.settings.generationConfig;
    this.updateSliderAndValue('maxTokens', config.maxTokens);
    this.updateSliderAndValue('temperature', config.temperature);
    this.updateSliderAndValue('topP', config.topP);
  }

  private updateTemplateSection(): void {
    const templatesList = document.getElementById('templatesList');
    if (!templatesList) return;

    if (this.templates.length === 0) {
      templatesList.innerHTML = '<p class="no-templates">No templates created yet.</p>';
      return;
    }

    const templatesHTML = this.templates.map(template => `
      <div class="template-item">
        <div class="template-header">
          <h4>${template.name}</h4>
          <div class="template-actions">
            <button class="btn-secondary btn-small" onclick="optionsController.editTemplate('${template.id}')">
              Edit
            </button>
            <button class="btn-danger btn-small" onclick="optionsController.deleteTemplate('${template.id}')">
              Delete
            </button>
          </div>
        </div>
        <div class="template-content">
          <p><strong>Category:</strong> ${template.category}</p>
          <p><strong>Template:</strong> ${template.template}</p>
          ${template.description ? `<p><strong>Description:</strong> ${template.description}</p>` : ''}
        </div>
      </div>
    `).join('');

    templatesList.innerHTML = templatesHTML;
  }

  private updatePrivacySection(): void {
    if (!this.settings) return;

    const analyticsEnabled = document.getElementById('analyticsEnabled') as HTMLInputElement;
    if (analyticsEnabled) {
      analyticsEnabled.checked = this.settings.analyticsEnabled;
    }

    const dataSharing = document.getElementById('dataSharing') as HTMLInputElement;
    if (dataSharing) {
      dataSharing.checked = this.settings.dataSharing;
    }
  }

  private updateAnalyticsSection(): void {
    if (!this.stats) return;

    const analytics = [
      { id: 'totalResponses', value: this.stats.totalResponses },
      { id: 'responsesThisWeek', value: this.stats.responsesThisWeek },
      { id: 'responsesThisMonth', value: this.stats.responsesThisMonth },
      { id: 'averageResponseTime', value: `${Math.round(this.stats.averageResponseTime)}ms` },
      { id: 'totalTokensGenerated', value: this.stats.totalTokensGenerated },
      { id: 'modelSwitches', value: this.stats.modelSwitches }
    ];

    analytics.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value.toString();
      }
    });
  }

  private updateSliderAndValue(id: string, value: number): void {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valueDisplay = document.getElementById(`${id}Value`);
    
    if (slider) {
      slider.value = value.toString();
    }
    if (valueDisplay) {
      valueDisplay.textContent = value.toString();
    }
  }

  private updateSliderValue(id: string, value: string): void {
    const valueDisplay = document.getElementById(`${id}Value`);
    if (valueDisplay) {
      valueDisplay.textContent = value;
    }
  }

  private showSection(sectionId: string): void {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
      section.classList.remove('active');
    });

    // Show target section
    const targetSection = document.getElementById(`${sectionId}Section`);
    if (targetSection) {
      targetSection.classList.add('active');
    }
  }

  private updateActiveNav(activeItem: Element): void {
    // Remove active class from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    // Add active class to clicked item
    activeItem.classList.add('active');
  }

  // Template management methods
  public showTemplateEditor(template?: MessageTemplate): void {
    this.currentEditingTemplate = template || null;
    
    const modal = document.getElementById('templateModal');
    const form = document.getElementById('templateForm') as HTMLFormElement;
    
    if (modal && form) {
      if (template) {
        // Edit mode
        (document.getElementById('templateName') as HTMLInputElement).value = template.name;
        (document.getElementById('templateCategory') as HTMLSelectElement).value = template.category;
        (document.getElementById('templateContent') as HTMLTextAreaElement).value = template.template;
        (document.getElementById('templateDescription') as HTMLTextAreaElement).value = template.description || '';
      } else {
        // Add mode
        form.reset();
      }
      
      modal.style.display = 'block';
    }
  }

  public hideTemplateEditor(): void {
    const modal = document.getElementById('templateModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.currentEditingTemplate = null;
  }

  public async saveTemplate(): Promise<void> {
    const form = document.getElementById('templateForm') as HTMLFormElement;
    const formData = new FormData(form);
    
    const template: MessageTemplate = {
      id: this.currentEditingTemplate?.id || `template_${Date.now()}`,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      template: formData.get('content') as string,
      description: formData.get('description') as string,
      createdAt: this.currentEditingTemplate?.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.SAVE_TEMPLATE,
        payload: template
      });

      if (response.success) {
        await this.loadTemplates();
        this.updateTemplateSection();
        this.hideTemplateEditor();
        this.showNotification('Template saved successfully', 'success');
      } else {
        throw new Error(response.error || 'Failed to save template');
      }
    } catch (error) {
      this.logger.error('Failed to save template:', error);
      this.showNotification('Failed to save template', 'error');
    }
  }

  public editTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      this.showTemplateEditor(template);
    }
  }

  public async deleteTemplate(templateId: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.DELETE_TEMPLATE,
        payload: { templateId }
      });

      if (response.success) {
        await this.loadTemplates();
        this.updateTemplateSection();
        this.showNotification('Template deleted successfully', 'success');
      } else {
        throw new Error(response.error || 'Failed to delete template');
      }
    } catch (error) {
      this.logger.error('Failed to delete template:', error);
      this.showNotification('Failed to delete template', 'error');
    }
  }

  // Model management methods
  private async loadAllModels(): Promise<void> {
    try {
      this.showLoading(true, 'Loading AI models...');

      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.LOAD_ALL_MODELS
      });

      if (response.success) {
        this.showNotification('All models loaded successfully', 'success');
      } else {
        throw new Error(response.error || 'Failed to load models');
      }
    } catch (error) {
      this.logger.error('Failed to load models:', error);
      this.showNotification('Failed to load models', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  private async clearModelCache(): Promise<void> {
    if (!confirm('This will clear all cached models and they will need to be reloaded. Continue?')) {
      return;
    }

    try {
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.CLEAR_MODEL_CACHE
      });

      if (response.success) {
        this.showNotification('Model cache cleared successfully', 'success');
      } else {
        throw new Error(response.error || 'Failed to clear cache');
      }
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      this.showNotification('Failed to clear cache', 'error');
    }
  }

  // Data management methods
  private async clearAllData(): Promise<void> {
    if (!confirm('This will permanently delete all extension data including settings, templates, and analytics. This cannot be undone. Continue?')) {
      return;
    }

    try {
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.CLEAR_ALL_DATA
      });

      if (response.success) {
        // Reload page to reset UI
        location.reload();
      } else {
        throw new Error(response.error || 'Failed to clear data');
      }
    } catch (error) {
      this.logger.error('Failed to clear data:', error);
      this.showNotification('Failed to clear data', 'error');
    }
  }

  private exportSettings(): void {
    if (!this.settings) return;

    const exportData = {
      settings: this.settings,
      templates: this.templates,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `linkedin-auto-reply-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Settings exported successfully', 'success');
  }

  private async importSettings(file: File): Promise<void> {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.settings || !importData.version) {
        throw new Error('Invalid settings file format');
      }

      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.IMPORT_SETTINGS,
        payload: importData
      });

      if (response.success) {
        // Reload page to reflect imported settings
        location.reload();
      } else {
        throw new Error(response.error || 'Failed to import settings');
      }
    } catch (error) {
      this.logger.error('Failed to import settings:', error);
      this.showNotification('Failed to import settings. Please check the file format.', 'error');
    }
  }

  private async resetToDefaults(): Promise<void> {
    if (!confirm('This will reset all settings to their default values. Continue?')) {
      return;
    }

    try {
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.RESET_SETTINGS
      });

      if (response.success) {
        await this.loadSettings();
        this.updateUI();
        this.showNotification('Settings reset to defaults', 'success');
      } else {
        throw new Error(response.error || 'Failed to reset settings');
      }
    } catch (error) {
      this.logger.error('Failed to reset settings:', error);
      this.showNotification('Failed to reset settings', 'error');
    }
  }

  // Utility methods
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

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="close-notification">&times;</button>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.hideNotification(notification);
    }, 5000);

    // Add close button listener
    const closeBtn = notification.querySelector('.close-notification');
    closeBtn?.addEventListener('click', () => {
      this.hideNotification(notification);
    });
  }

  private hideNotification(notification: Element): void {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }
}

// Create global instance
const optionsController = new OptionsController();

// Make it available globally for onclick handlers
(window as any).optionsController = optionsController;
