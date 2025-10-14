/**
 * Provider storage service for managing API keys and settings
 */

import { ProviderType } from '../inference/inference-provider';

/**
 * Provider settings stored in Chrome storage
 */
export interface ProviderSettings {
  /** Currently selected provider */
  providerType: ProviderType;
  /** API keys for external providers (encrypted) */
  apiKeys: {
    claude?: string;
    gemini?: string;
    openai?: string;
  };
  /** Model selections per provider */
  models: {
    local?: string;
    claude?: string;
    gemini?: string;
    openai?: string;
    mock?: string;
  };
  /** Privacy consent status */
  privacyConsent: {
    hasConsented: boolean;
    consentDate?: number;
    version?: string;
  };
  /** Usage statistics */
  usage: {
    totalRequests: number;
    requestsByProvider: Record<ProviderType, number>;
    lastUsed?: number;
  };
}

/**
 * Default provider settings
 */
const DEFAULT_SETTINGS: ProviderSettings = {
  providerType: 'local',
  apiKeys: {},
  models: {
    local: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
  },
  privacyConsent: {
    hasConsented: false
  },
  usage: {
    totalRequests: 0,
    requestsByProvider: {
      local: 0,
      claude: 0,
      gemini: 0,
      openai: 0,
      mock: 0
    }
  }
};

/**
 * Provider storage manager
 */
export class ProviderStorage {
  private static STORAGE_KEY = 'providerSettings';
  private static ENCRYPTION_KEY = 'replymate-provider-key';

  /**
   * Get all provider settings
   */
  static async getSettings(): Promise<ProviderSettings> {
    try {
      const result = await chrome.storage.sync.get(this.STORAGE_KEY);
      const settings = result[this.STORAGE_KEY] || {};

      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SETTINGS,
        ...settings,
        apiKeys: {
          ...DEFAULT_SETTINGS.apiKeys,
          ...(settings.apiKeys || {})
        },
        models: {
          ...DEFAULT_SETTINGS.models,
          ...(settings.models || {})
        },
        privacyConsent: {
          ...DEFAULT_SETTINGS.privacyConsent,
          ...(settings.privacyConsent || {})
        },
        usage: {
          ...DEFAULT_SETTINGS.usage,
          ...(settings.usage || {}),
          requestsByProvider: {
            ...DEFAULT_SETTINGS.usage.requestsByProvider,
            ...(settings.usage?.requestsByProvider || {})
          }
        }
      };
    } catch (error) {
      console.error('Failed to get provider settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save provider settings
   */
  static async saveSettings(settings: Partial<ProviderSettings>): Promise<void> {
    try {
      const current = await this.getSettings();
      const updated = {
        ...current,
        ...settings
      };

      await chrome.storage.sync.set({
        [this.STORAGE_KEY]: updated
      });
    } catch (error) {
      console.error('Failed to save provider settings:', error);
      throw error;
    }
  }

  /**
   * Get current provider type
   */
  static async getCurrentProvider(): Promise<ProviderType> {
    const settings = await this.getSettings();
    return settings.providerType;
  }

  /**
   * Set current provider type
   */
  static async setCurrentProvider(type: ProviderType): Promise<void> {
    await this.saveSettings({ providerType: type });
  }

  /**
   * Get API key for a provider
   */
  static async getApiKey(provider: Exclude<ProviderType, 'local' | 'mock'>): Promise<string | undefined> {
    const settings = await this.getSettings();
    const encryptedKey = settings.apiKeys[provider];

    if (!encryptedKey) {
      return undefined;
    }

    // Decrypt the API key (simple XOR for now, consider better encryption)
    return this.decrypt(encryptedKey);
  }

  /**
   * Set API key for a provider
   */
  static async setApiKey(provider: Exclude<ProviderType, 'local' | 'mock'>, apiKey: string): Promise<void> {
    const settings = await this.getSettings();

    // Encrypt the API key before storing
    const encryptedKey = this.encrypt(apiKey);

    await this.saveSettings({
      apiKeys: {
        ...settings.apiKeys,
        [provider]: encryptedKey
      }
    });
  }

  /**
   * Remove API key for a provider
   */
  static async removeApiKey(provider: Exclude<ProviderType, 'local' | 'mock'>): Promise<void> {
    const settings = await this.getSettings();
    const { [provider]: removed, ...rest } = settings.apiKeys;

    await this.saveSettings({
      apiKeys: rest
    });
  }

  /**
   * Get model for a provider
   */
  static async getModel(provider: ProviderType): Promise<string | undefined> {
    const settings = await this.getSettings();
    return settings.models[provider];
  }

  /**
   * Set model for a provider
   */
  static async setModel(provider: ProviderType, model: string): Promise<void> {
    const settings = await this.getSettings();

    await this.saveSettings({
      models: {
        ...settings.models,
        [provider]: model
      }
    });
  }

  /**
   * Get privacy consent status
   */
  static async getPrivacyConsent(): Promise<ProviderSettings['privacyConsent']> {
    const settings = await this.getSettings();
    return settings.privacyConsent;
  }

  /**
   * Set privacy consent
   */
  static async setPrivacyConsent(consented: boolean): Promise<void> {
    await this.saveSettings({
      privacyConsent: {
        hasConsented: consented,
        consentDate: consented ? Date.now() : undefined,
        version: chrome.runtime.getManifest().version
      }
    });
  }

  /**
   * Check if user needs to consent to privacy for external APIs
   */
  static async needsPrivacyConsent(provider: ProviderType): Promise<boolean> {
    if (provider === 'local' || provider === 'mock') {
      return false; // No consent needed for local AI or mock
    }

    const settings = await this.getSettings();
    return !settings.privacyConsent.hasConsented;
  }

  /**
   * Update usage statistics
   */
  static async recordUsage(provider: ProviderType): Promise<void> {
    const settings = await this.getSettings();

    await this.saveSettings({
      usage: {
        ...settings.usage,
        totalRequests: settings.usage.totalRequests + 1,
        requestsByProvider: {
          ...settings.usage.requestsByProvider,
          [provider]: (settings.usage.requestsByProvider[provider] || 0) + 1
        },
        lastUsed: Date.now()
      }
    });
  }

  /**
   * Get usage statistics
   */
  static async getUsageStats(): Promise<ProviderSettings['usage']> {
    const settings = await this.getSettings();
    return settings.usage;
  }

  /**
   * Clear all provider data
   */
  static async clearAll(): Promise<void> {
    await chrome.storage.sync.remove(this.STORAGE_KEY);
  }

  /**
   * Simple encryption (XOR with key)
   * Note: This is basic protection. For production, use proper encryption.
   */
  private static encrypt(text: string): string {
    const key = this.ENCRYPTION_KEY;
    let result = '';

    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }

    // Convert to base64 for storage
    // Use Buffer in Node.js environment or btoa in browser
    if (typeof btoa !== 'undefined') {
      return btoa(result);
    } else {
      return Buffer.from(result, 'binary').toString('base64');
    }
  }

  /**
   * Simple decryption (XOR with key)
   */
  private static decrypt(encrypted: string): string {
    try {
      // Decode from base64
      // Use Buffer in Node.js environment or atob in browser
      let text: string;
      if (typeof atob !== 'undefined') {
        text = atob(encrypted);
      } else {
        text = Buffer.from(encrypted, 'base64').toString('binary');
      }
      const key = this.ENCRYPTION_KEY;
      let result = '';

      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
      }

      return result;
    } catch (error) {
      console.error('Failed to decrypt:', error);
      return '';
    }
  }

  /**
   * Validate API key format for a provider
   */
  static validateApiKeyFormat(provider: Exclude<ProviderType, 'local' | 'mock'>, apiKey: string): boolean {
    switch (provider) {
      case 'claude':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;

      case 'gemini':
        return apiKey.startsWith('AIza') || apiKey.length > 20;

      case 'openai':
        return apiKey.startsWith('sk-') || apiKey.startsWith('sk-proj-');

      default:
        return false;
    }
  }

  /**
   * Get provider configuration for initialization
   */
  static async getProviderConfig(provider?: ProviderType): Promise<{
    type: ProviderType;
    apiKey?: string;
    model?: string;
  }> {
    const settings = await this.getSettings();
    const type = provider || settings.providerType;

    if (type === 'local' || type === 'mock') {
      return {
        type,
        model: settings.models[type]
      };
    }

    // Get decrypted API key for external providers
    const apiKey = await this.getApiKey(type as Exclude<ProviderType, 'local' | 'mock'>);

    return {
      type,
      apiKey,
      model: settings.models[type]
    };
  }

  /**
   * Check if provider is properly configured
   */
  static async isProviderConfigured(provider: ProviderType): Promise<boolean> {
    if (provider === 'local' || provider === 'mock') {
      return true; // Always configured
    }

    const apiKey = await this.getApiKey(provider as Exclude<ProviderType, 'local' | 'mock'>);
    return !!apiKey && this.validateApiKeyFormat(provider as Exclude<ProviderType, 'local' | 'mock'>, apiKey);
  }

  /**
   * Get all configured providers
   */
  static async getConfiguredProviders(): Promise<ProviderType[]> {
    const settings = await this.getSettings();
    const configured: ProviderType[] = ['local']; // Always available

    // Check which external providers have valid API keys
    for (const provider of ['claude', 'gemini', 'openai'] as const) {
      const apiKey = settings.apiKeys[provider];
      if (apiKey) {
        const decrypted = this.decrypt(apiKey);
        if (decrypted && this.validateApiKeyFormat(provider, decrypted)) {
          configured.push(provider);
        }
      }
    }

    return configured;
  }
}