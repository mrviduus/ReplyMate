"use strict";

import "./popup.css";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { ProviderStorage } from "./services/provider-storage";

// Provider types
type ProviderType = 'local' | 'claude' | 'openai' | 'gemini';

// Model configuration for WebLLM models
const MODEL_PROFILES = {
  'professional': {
    models: ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'gemma-2-2b-it-q4f16_1-MLC'],
    description: 'Highest quality (requires powerful device)',
    performance: 'High Quality',
    memory: 'High (200MB+)'
  },
  'balanced': {
    models: ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC', 'gemma-2-2b-it-q4f16_1-MLC'],
    description: 'Optimal: Great quality + browser compatible',
    performance: 'Excellent',
    memory: 'Medium (100MB)'
  },
  'fast': {
    models: ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', 'Qwen2-0.5B-Instruct-q4f16_1-MLC'],
    description: 'Fastest responses for low-end devices',
    performance: 'Fast',
    memory: 'Low'
  }
} as const;

type ModelProfileKey = keyof typeof MODEL_PROFILES;

// Model status states
enum ModelStatus {
  CHECKING = 'checking',
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  NOT_INITIALIZED = 'not_initialized'
}

// Get element by ID with type safety
function getElementAndCheck(id: string): HTMLElement | null {
  return document.getElementById(id);
}

// UI Elements - Provider Selection
const providerSelector = getElementAndCheck("provider-selection") as HTMLSelectElement;
const apiKeySection = getElementAndCheck("apiKeySection");
const apiKeyInput = getElementAndCheck("apiKeyInput") as HTMLInputElement;
const apiKeyLabel = getElementAndCheck("apiKeyLabel");
const apiKeyHelpText = getElementAndCheck("apiKeyHelpText");
const saveApiKeyBtn = getElementAndCheck("saveApiKey") as HTMLButtonElement;
const testApiKeyBtn = getElementAndCheck("testApiKey") as HTMLButtonElement;
const toggleApiKeyBtn = getElementAndCheck("toggleApiKeyVisibility") as HTMLButtonElement;

// Provider info cards
const localInfo = getElementAndCheck("webllmInfo"); // webllmInfo is the HTML id, keeping for backward compat
const claudeInfo = getElementAndCheck("claudeInfo");
const openaiInfo = getElementAndCheck("openaiInfo");
const geminiInfo = getElementAndCheck("geminiInfo");

// Model section (for WebLLM)
const modelSection = getElementAndCheck("modelSection");

// UI Elements - Model Status Bar
const modelStatusBar = getElementAndCheck("modelStatusBar");
const statusIcon = getElementAndCheck("statusIcon");
const statusLabel = getElementAndCheck("statusLabel");
const modelInfo = getElementAndCheck("modelInfo");
const progressContainer = getElementAndCheck("progressContainer");
const progressFill = getElementAndCheck("progressFill");
const progressText = getElementAndCheck("progressText");

// UI Elements - Model Configuration (WebLLM)
const modelSelector = getElementAndCheck("model-selection") as HTMLSelectElement;
const modelChangeStatus = getElementAndCheck("modelChangeStatus");
const modelDetails = getElementAndCheck("modelDetails");
const currentModelName = getElementAndCheck("currentModelName");
const modelPerformance = getElementAndCheck("modelPerformance");
const memoryUsage = getElementAndCheck("memoryUsage");

// UI Elements - Settings
const settingsLoading = getElementAndCheck("settingsLoading");
const settingsContent = getElementAndCheck("settingsContent");
const standardPromptElement = getElementAndCheck("standardPrompt") as HTMLTextAreaElement;
const withCommentsPromptElement = getElementAndCheck("withCommentsPrompt") as HTMLTextAreaElement;
const savePromptsBtn = getElementAndCheck("savePrompts") as HTMLButtonElement;
const resetPromptsBtn = getElementAndCheck("resetPrompts") as HTMLButtonElement;
const testPromptsBtn = getElementAndCheck("testPrompts") as HTMLButtonElement;
const settingsStatus = getElementAndCheck("settingsStatus");

// Quick Actions
const checkStatusBtn = getElementAndCheck("checkStatus") as HTMLButtonElement;
const reinitModelBtn = getElementAndCheck("reinitModel") as HTMLButtonElement;

// Current state
let currentProvider: ProviderType = 'local';
let selectedModel = "";
let apiKeyVisible = false;

// Default prompts
let defaultPrompts = {
  standard: '',
  withComments: ''
};

// Provider API key help text
const API_KEY_HELP: Record<ProviderType, string> = {
  local: 'No API key required - runs locally on your device',
  claude: 'Get your API key from console.anthropic.com/api',
  openai: 'Get your API key from platform.openai.com/api-keys',
  gemini: 'Get your API key from makersuite.google.com/app/apikey'
};

// Initialize provider selection
async function initializeProviderSelection() {
  // Load saved provider
  const settings = await ProviderStorage.getSettings();
  currentProvider = (settings as any).provider || 'local';

  if (providerSelector) {
    providerSelector.value = currentProvider;
  }

  // Update UI based on provider
  await updateProviderUI(currentProvider);

  // Load API key if exists
  if (currentProvider !== 'local') {
    const apiKey = await ProviderStorage.getApiKey(currentProvider);
    if (apiKeyInput && apiKey) {
      apiKeyInput.value = apiKey;
    }
  }
}

// Update UI based on selected provider
async function updateProviderUI(provider: ProviderType) {
  currentProvider = provider;

  // Show/hide API key section
  if (apiKeySection) {
    apiKeySection.style.display = provider === 'local' ? 'none' : 'block';
  }

  // Show/hide model section (only for WebLLM)
  if (modelSection) {
    modelSection.style.display = provider === 'local' ? 'block' : 'none';
  }

  // Update API key help text
  if (apiKeyLabel) {
    const labels: Record<ProviderType, string> = {
      local: 'API Key',
      claude: 'Claude API Key',
      openai: 'OpenAI API Key',
      gemini: 'Gemini API Key'
    };
    apiKeyLabel.textContent = labels[provider];
  }

  if (apiKeyHelpText) {
    apiKeyHelpText.textContent = API_KEY_HELP[provider];
  }

  // Update placeholder
  if (apiKeyInput) {
    const placeholders: Record<ProviderType, string> = {
      local: '',
      claude: 'sk-ant-api03-...',
      openai: 'sk-...',
      gemini: 'AIza...'
    };
    apiKeyInput.placeholder = `Enter your ${placeholders[provider]} API key...`;
  }

  // Show/hide provider info cards
  const infoCards = { webllmInfo: localInfo, claudeInfo, openaiInfo, geminiInfo };
  Object.entries(infoCards).forEach(([key, element]) => {
    if (element) {
      element.style.display = key === `${provider}Info` ? 'block' : 'none';
    }
  });

  // Update status based on provider
  await checkProviderStatus();
}

// Check provider status
async function checkProviderStatus() {
  updateModelStatus(ModelStatus.CHECKING, `Checking ${currentProvider} status...`);

  if (currentProvider === 'local') {
    // Check WebLLM model status
    checkModelStatus();
  } else {
    // Check API key status for external providers
    const apiKey = await ProviderStorage.getApiKey(currentProvider);
    if (!apiKey) {
      updateModelStatus(ModelStatus.NOT_INITIALIZED, 'API key required', `Please enter your ${currentProvider} API key`);
    } else {
      updateModelStatus(ModelStatus.CHECKING, 'Validating API key...');

      // Send message to background to validate API key
      chrome.runtime.sendMessage({
        action: 'validateApiKey',
        provider: currentProvider,
        apiKey: apiKey
      }, (response) => {
        if (response?.valid) {
          updateModelStatus(ModelStatus.READY, `✅ ${currentProvider} ready`, 'API key validated');
        } else {
          updateModelStatus(ModelStatus.ERROR, 'Invalid API key', response?.error || 'Please check your API key');
        }
      });
    }
  }
}

// Handle provider change
async function handleProviderChange() {
  if (!providerSelector) return;

  const newProvider = providerSelector.value as ProviderType;
  if (newProvider === currentProvider) return;

  // Save new provider
  await ProviderStorage.saveSettings({
    model: newProvider === 'local' ? selectedModel : undefined
  } as any);

  // Update UI
  await updateProviderUI(newProvider);

  // Notify background script
  chrome.runtime.sendMessage({
    action: 'switchProvider',
    provider: newProvider
  }, (response) => {
    if (response?.success) {
      showStatus(`Switched to ${newProvider}`, 'success');
    } else {
      showStatus(`Failed to switch provider: ${response?.error}`, 'error');
    }
  });
}

// Save API key
async function saveApiKey() {
  if (!apiKeyInput || currentProvider === 'local') return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  saveApiKeyBtn.disabled = true;
  showStatus('Saving API key...', 'info');

  try {
    await ProviderStorage.setApiKey(currentProvider, apiKey);

    // Validate the API key
    chrome.runtime.sendMessage({
      action: 'validateApiKey',
      provider: currentProvider,
      apiKey: apiKey
    }, (response) => {
      saveApiKeyBtn.disabled = false;

      if (response?.valid) {
        showStatus('✅ API key saved and validated!', 'success');
        updateModelStatus(ModelStatus.READY, `✅ ${currentProvider} ready`, 'API key validated');
      } else {
        showStatus(`API key saved but validation failed: ${response?.error || 'Unknown error'}`, 'error');
        updateModelStatus(ModelStatus.ERROR, 'Invalid API key', 'Please check your API key');
      }
    });
  } catch (error) {
    saveApiKeyBtn.disabled = false;
    showStatus('Failed to save API key', 'error');
  }
}

// Test API key connection
async function testApiKey() {
  if (!apiKeyInput || currentProvider === 'local') return;

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  testApiKeyBtn.disabled = true;
  showStatus('Testing connection...', 'info');

  chrome.runtime.sendMessage({
    action: 'testProvider',
    provider: currentProvider,
    apiKey: apiKey
  }, (response) => {
    testApiKeyBtn.disabled = false;

    if (response?.success) {
      showStatus(`✅ Connection successful! Model: ${response.model}`, 'success');
    } else {
      showStatus(`Connection failed: ${response?.error || 'Unknown error'}`, 'error');
    }
  });
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  if (!apiKeyInput || !toggleApiKeyBtn) return;

  apiKeyVisible = !apiKeyVisible;
  apiKeyInput.type = apiKeyVisible ? 'text' : 'password';

  const icon = toggleApiKeyBtn.querySelector('i');
  if (icon) {
    icon.className = apiKeyVisible ? 'fa fa-eye-slash' : 'fa fa-eye';
  }
}

// Update model status UI
function updateModelStatus(status: ModelStatus, message: string, details?: string) {
  if (!modelStatusBar || !statusIcon || !statusLabel) return;

  // Remove all status classes
  modelStatusBar.className = 'model-status-bar';

  // Update status bar color based on status
  switch (status) {
    case ModelStatus.CHECKING:
      modelStatusBar.classList.add('loading');
      statusIcon.innerHTML = '<i class="fa fa-circle-notch fa-spin"></i>';
      break;
    case ModelStatus.LOADING:
      modelStatusBar.classList.add('loading');
      statusIcon.innerHTML = '<i class="fa fa-download fa-pulse"></i>';
      break;
    case ModelStatus.READY:
      modelStatusBar.classList.add('ready');
      statusIcon.innerHTML = '<i class="fa fa-check-circle"></i>';
      statusIcon.classList.add('pulse');
      break;
    case ModelStatus.ERROR:
      modelStatusBar.classList.add('error');
      statusIcon.innerHTML = '<i class="fa fa-exclamation-triangle"></i>';
      break;
    case ModelStatus.NOT_INITIALIZED:
      statusIcon.innerHTML = '<i class="fa fa-info-circle"></i>';
      break;
  }

  // Update text
  statusLabel.textContent = message;
  if (modelInfo && details) {
    modelInfo.textContent = details;
    modelInfo.style.display = 'block';
  } else if (modelInfo) {
    modelInfo.style.display = 'none';
  }
}

// Check model status (for WebLLM)
async function checkModelStatus() {
  if (currentProvider !== 'local') return;

  updateModelStatus(ModelStatus.CHECKING, "Checking model status...");

  chrome.runtime.sendMessage({ action: 'checkEngineStatus' }, (response) => {
    if (chrome.runtime.lastError) {
      updateModelStatus(ModelStatus.ERROR, "Extension error", chrome.runtime.lastError.message);
      return;
    }

    if (response?.engineReady) {
      const activeModel = response.currentModel || selectedModel;
      const modelName = getModelDisplayName(activeModel);
      updateModelStatus(ModelStatus.READY, "✅ AI Model Ready", `Active: ${modelName}`);
      showModelDetails(activeModel, true);
    } else if (response?.initializing) {
      updateModelStatus(ModelStatus.LOADING, "Model initializing...", "Loading from cache");
    } else {
      updateModelStatus(ModelStatus.NOT_INITIALIZED, "Model not initialized", "Click 'Reinitialize Model' to start");
    }
  });
}

// Extract display name from model ID
function getModelDisplayName(modelId: string): string {
  const parts = modelId.split('-');
  const nameParts = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].includes('q4f16') || parts[i] === 'MLC') {
      break;
    }
    nameParts.push(parts[i]);
  }
  return nameParts.join('-');
}

// Show model details (for WebLLM)
function showModelDetails(modelId: string, isActuallyActive: boolean = false) {
  if (!modelDetails || !currentModelName || !modelPerformance || !memoryUsage) return;
  if (currentProvider !== 'local') return;

  modelDetails.style.display = 'block';

  // Get readable name
  const displayName = getModelDisplayName(modelId);
  currentModelName.textContent = displayName;

  // Determine profile from model
  let profile: ModelProfileKey = 'balanced';
  for (const [key, config] of Object.entries(MODEL_PROFILES)) {
    if ((config.models as readonly string[]).includes(modelId)) {
      profile = key as ModelProfileKey;
      break;
    }
  }

  const profileConfig = MODEL_PROFILES[profile];
  modelPerformance.textContent = profileConfig.performance;
  memoryUsage.textContent = profileConfig.memory + ' Memory Usage';
}

// Initialize model selector (for WebLLM)
async function setupModelSelector() {
  if (!modelSelector || currentProvider !== 'local') return;

  modelSelector.innerHTML = '';

  const appConfig = prebuiltAppConfig;
  const availableModels = new Set(appConfig.model_list.map(m => m.model_id));
  const addedModels = new Set<string>();

  Object.entries(MODEL_PROFILES).forEach(([profileName, profile]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = `${profileName.charAt(0).toUpperCase() + profileName.slice(1)} - ${profile.description}`;

    profile.models.forEach(modelId => {
      if (availableModels.has(modelId) && !addedModels.has(modelId)) {
        const option = document.createElement('option');
        option.value = modelId;
        option.text = getModelDisplayName(modelId);
        if (modelId === selectedModel) {
          option.selected = true;
        }
        optgroup.appendChild(option);
        addedModels.add(modelId);
      }
    });

    if (optgroup.children.length > 0) {
      modelSelector.appendChild(optgroup);
    }
  });
}

// Show status message
function showStatus(message: string, type: 'success' | 'error' | 'info') {
  if (!settingsStatus) return;

  settingsStatus.innerHTML = message;
  settingsStatus.className = `status-message ${type}`;
  settingsStatus.style.display = 'block';

  const displayTime = type === 'info' ? 5000 : 3000;

  setTimeout(() => {
    if (settingsStatus) {
      settingsStatus.style.display = 'none';
    }
  }, displayTime);
}

// Load settings from storage
async function loadSettings() {
  if (!settingsLoading || !settingsContent) return;

  settingsLoading.style.display = 'block';
  settingsContent.style.opacity = '0.5';

  try {
    chrome.runtime.sendMessage({ action: 'getPrompts' }, (response) => {
      if (response) {
        defaultPrompts = response.defaults || defaultPrompts;
        const customPrompts = response.prompts || {};

        if (standardPromptElement) {
          standardPromptElement.value = customPrompts.standard || defaultPrompts.standard;
        }
        if (withCommentsPromptElement) {
          withCommentsPromptElement.value = customPrompts.withComments || defaultPrompts.withComments;
        }
      }

      settingsLoading.style.display = 'none';
      settingsContent.style.opacity = '1';
    });
  } catch (error) {
    console.error('Failed to load settings:', error);
    settingsLoading.style.display = 'none';
    settingsContent.style.opacity = '1';
    showStatus('Failed to load settings', 'error');
  }
}

// Save prompts to storage
async function savePrompts() {
  if (!standardPromptElement || !withCommentsPromptElement) return;

  const standardPrompt = standardPromptElement.value.trim();
  const withCommentsPrompt = withCommentsPromptElement.value.trim();

  if (!standardPrompt && !withCommentsPrompt) {
    showStatus('Please enter at least one prompt', 'error');
    return;
  }

  savePromptsBtn.disabled = true;
  resetPromptsBtn.disabled = true;
  showStatus('Saving prompts...', 'info');

  chrome.runtime.sendMessage({
    action: 'savePrompts',
    prompts: {
      standard: standardPrompt,
      withComments: withCommentsPrompt
    }
  }, (response) => {
    savePromptsBtn.disabled = false;
    resetPromptsBtn.disabled = false;

    if (response?.success) {
      showStatus('✅ Settings saved successfully!', 'success');
    } else {
      showStatus('Failed to save settings', 'error');
    }
  });
}

// Initialize popup on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log('🚀 ReplyMate popup opened - Multi-Provider UI');

  // Initial status
  updateModelStatus(ModelStatus.CHECKING, "Initializing ReplyMate...");

  // Initialize provider selection
  await initializeProviderSelection();

  // Setup model selector if WebLLM
  if (currentProvider === 'local') {
    await setupModelSelector();
  }

  // Load settings
  await loadSettings();

  // Check provider status
  await checkProviderStatus();

  // Setup event handlers
  if (providerSelector) {
    providerSelector.addEventListener('change', handleProviderChange);
  }

  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', saveApiKey);
  }

  if (testApiKeyBtn) {
    testApiKeyBtn.addEventListener('click', testApiKey);
  }

  if (toggleApiKeyBtn) {
    toggleApiKeyBtn.addEventListener('click', toggleApiKeyVisibility);
  }

  if (modelSelector) {
    modelSelector.addEventListener('change', async () => {
      selectedModel = modelSelector.value;
      await ProviderStorage.saveSettings({
        model: selectedModel
      } as any);

      chrome.runtime.sendMessage({
        action: 'updateModel',
        model: selectedModel
      });
    });
  }

  if (savePromptsBtn) {
    savePromptsBtn.addEventListener('click', savePrompts);
  }

  if (resetPromptsBtn) {
    resetPromptsBtn.addEventListener('click', async () => {
      if (!confirm('Reset all prompts to default values?')) return;

      chrome.runtime.sendMessage({ action: 'resetPrompts' }, (response) => {
        if (response?.success) {
          if (standardPromptElement) {
            standardPromptElement.value = defaultPrompts.standard;
          }
          if (withCommentsPromptElement) {
            withCommentsPromptElement.value = defaultPrompts.withComments;
          }
          showStatus('✅ Prompts reset to defaults', 'success');
        } else {
          showStatus('Failed to reset prompts', 'error');
        }
      });
    });
  }

  if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', checkProviderStatus);
  }

  if (reinitModelBtn) {
    reinitModelBtn.addEventListener('click', async () => {
      reinitModelBtn.disabled = true;
      updateModelStatus(ModelStatus.LOADING, "Initializing provider...");

      chrome.runtime.sendMessage({
        action: 'initializeProvider',
        provider: currentProvider
      }, (response) => {
        reinitModelBtn.disabled = false;

        if (response?.success) {
          checkProviderStatus();
        } else {
          updateModelStatus(ModelStatus.ERROR, "Initialization failed", response?.error || "Please try again");
        }
      });
    });
  }

  // Notify background that popup is open
  chrome.runtime.sendMessage({ action: 'popupReady' });
});