"use strict";

import "./popup.css";
import { prebuiltAppConfig } from "@mlc-ai/web-llm";

// Model configuration for different use cases
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

// Loading stages for detailed progress
interface LoadingProgress {
  progress: number;
  message: string;
  stage: 'initializing' | 'downloading' | 'loading' | 'finalizing' | 'complete';
  isFirstLoad: boolean;
}

// Get element by ID with type safety
function getElementAndCheck(id: string): HTMLElement | null {
  return document.getElementById(id);
}

// UI Elements - Model Status Bar
const modelStatusBar = getElementAndCheck("modelStatusBar");
const statusIcon = getElementAndCheck("statusIcon");
const statusLabel = getElementAndCheck("statusLabel");
const modelInfo = getElementAndCheck("modelInfo");
const progressContainer = getElementAndCheck("progressContainer");
const progressFill = getElementAndCheck("progressFill");
const progressText = getElementAndCheck("progressText");

// UI Elements - Model Configuration
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

// Model configuration
let selectedModel = "";
let actualActiveModel = ""; // The model actually running in background
let currentProfile: ModelProfileKey = 'balanced';

// Default prompts
let defaultPrompts = {
  standard: '',
  withComments: ''
};

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

// Update progress bar
function updateProgress(progress: number, text?: string) {
  if (progressContainer && progressFill && progressText) {
    if (progress > 0) {
      progressContainer.style.display = 'flex';
      progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      progressText.textContent = text || `${Math.round(progress)}%`;
    } else {
      progressContainer.style.display = 'none';
    }
  }
}

// Show model details
function showModelDetails(modelId: string, isActuallyActive: boolean = false) {
  if (!modelDetails || !currentModelName || !modelPerformance || !memoryUsage) return;

  modelDetails.style.display = 'block';

  // Get readable name
  const displayName = getModelDisplayName(modelId);
  currentModelName.textContent = displayName;

  // Update the actual active model if confirmed by background
  if (isActuallyActive) {
    actualActiveModel = modelId;
  }

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

// Smart model selection - BALANCED for reliable LinkedIn performance
function getOptimalModel(): string {
  try {
    const availableModelIds = prebuiltAppConfig.model_list.map(m => m.model_id);

    // Prioritize balanced models: Quality with stable performance
    const optimalModels = [
      "Llama-3.2-1B-Instruct-q4f16_1-MLC",  // OPTIMAL: Best balance of quality and performance
      "gemma-2-2b-it-q4f16_1-MLC",          // Good alternative
      "Phi-3.5-mini-instruct-q4f16_1-MLC",  // Lightweight option
      "Llama-3.2-3B-Instruct-q4f16_1-MLC",  // Heavy model (may have issues)
      "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"   // Ultra-light fallback
    ];

    // Return the first available balanced model
    for (const modelId of optimalModels) {
      if (availableModelIds.includes(modelId)) {
        console.log('⚖️ Selected balanced model for LinkedIn:', modelId);
        currentProfile = 'balanced';
        return modelId;
      }
    }

    // Ultimate fallback
    return availableModelIds[0] || "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  } catch (error) {
    console.error('Error selecting optimal model:', error);
    return "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // Default to balanced
  }
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

// Initialize model selector
async function setupModelSelector() {
  if (!modelSelector) return;

  updateModelStatus(ModelStatus.CHECKING, "Loading model list...");

  modelSelector.innerHTML = '';

  // First check what model is actually active in background
  await checkActualActiveModel();

  // Use actual active model if available, otherwise fall back to stored or optimal
  const { selectedModel: storedModel } = await chrome.storage.local.get('selectedModel');
  if (!selectedModel) {
    selectedModel = actualActiveModel || storedModel || getOptimalModel();
  }

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

  // Don't show details yet - wait for actual status check
  // updateModelStatus will be called by checkModelStatus()
}

// Handle model selection change
async function handleSelectChange() {
  if (!modelSelector || !modelChangeStatus) return;

  const newModel = modelSelector.value;
  if (newModel === selectedModel) return;

  selectedModel = newModel;
  await chrome.storage.local.set({ selectedModel });

  // Show loading indicator
  modelChangeStatus.style.display = 'flex';
  modelSelector.disabled = true;

  updateModelStatus(ModelStatus.LOADING, "Switching model...", `Loading ${getModelDisplayName(selectedModel)}`);
  updateProgress(0, "Initializing...");

  // Notify background to load the new model
  chrome.runtime.sendMessage({
    action: 'updateModel',
    model: selectedModel
  }, (response) => {
    modelChangeStatus.style.display = 'none';
    modelSelector.disabled = false;
    updateProgress(0);

    if (response?.success) {
      actualActiveModel = selectedModel;
      showModelDetails(selectedModel, true);
      updateModelStatus(ModelStatus.READY, "✅ Model switched successfully", `Active: ${getModelDisplayName(selectedModel)}`);
    } else {
      // Revert selection on failure
      modelSelector.value = actualActiveModel || selectedModel;
      updateModelStatus(ModelStatus.ERROR, "Failed to switch model", "Please try again");
    }
  });
}

// Check what model is actually active in background
async function checkActualActiveModel(): Promise<void> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'checkEngineStatus' }, async (response) => {
      if (!chrome.runtime.lastError && response?.currentModel) {
        actualActiveModel = response.currentModel;

        // Update selector to match actual model
        if (modelSelector && actualActiveModel) {
          modelSelector.value = actualActiveModel;
          selectedModel = actualActiveModel;
          await chrome.storage.local.set({ selectedModel: actualActiveModel });
        }
      }
      resolve();
    });
  });
}

// Check model status
async function checkModelStatus() {
  updateModelStatus(ModelStatus.CHECKING, "Checking model status...");
  updateProgress(5, "Connecting...");

  chrome.runtime.sendMessage({ action: 'checkEngineStatus' }, (response) => {
    if (chrome.runtime.lastError) {
      updateModelStatus(ModelStatus.ERROR, "Extension error", chrome.runtime.lastError.message);
      updateProgress(0);
      return;
    }

    if (response?.engineReady) {
      // Use the actual model from background
      const activeModel = response.currentModel || selectedModel;
      actualActiveModel = activeModel;

      // Update selector to match
      if (modelSelector && activeModel !== modelSelector.value) {
        modelSelector.value = activeModel;
        selectedModel = activeModel;
      }

      const modelName = getModelDisplayName(activeModel);
      updateModelStatus(ModelStatus.READY, "✅ AI Model Ready", `Active: ${modelName} • ${response.cacheMessage || ''}`);
      showModelDetails(activeModel, true);
      updateProgress(100, "100%");
      setTimeout(() => updateProgress(0), 1500);
    } else if (response?.initializing) {
      const cacheMsg = response?.cached
        ? "Loading from cache (fast)"
        : "First-time download (1-3 minutes)";
      updateModelStatus(ModelStatus.LOADING, "Model initializing...", cacheMsg);
      updateProgress(15, "Starting...");

      // If not cached, show warning
      if (!response?.cached) {
        showStatus('⏱️ First-time setup: Downloading AI model (50-200MB). This only happens once!', 'info');
      }
    } else {
      updateModelStatus(ModelStatus.NOT_INITIALIZED, "Model not initialized", "Click 'Reinitialize Model' to start");
      updateProgress(0);
    }
  });
}

// Reinitialize model
async function reinitializeModel() {
  if (!reinitModelBtn) return;

  reinitModelBtn.disabled = true;
  updateModelStatus(ModelStatus.LOADING, "Starting model initialization...", "Checking cache status...");
  updateProgress(0, "Preparing...");

  // Request model initialization
  chrome.runtime.sendMessage({
    action: 'initializeModel'
  }, (response) => {
    reinitModelBtn.disabled = false;

    if (response?.success) {
      updateProgress(100, "Complete!");
      // Re-check actual status after initialization
      setTimeout(() => checkModelStatus(), 500);
    } else {
      updateProgress(0);
      updateModelStatus(ModelStatus.ERROR, "Initialization failed", response?.error || "Please try again");
    }
  });
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

// Reset prompts to defaults
async function resetPrompts() {
  if (!confirm('Reset all prompts to default values?')) {
    return;
  }

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
}

// Test prompts
async function testPrompts() {
  if (!testPromptsBtn) return;

  testPromptsBtn.disabled = true;
  showStatus('Testing prompts...', 'info');

  const standardPrompt = standardPromptElement?.value.trim() || '';
  const withCommentsPrompt = withCommentsPromptElement?.value.trim() || '';

  chrome.runtime.sendMessage({
    action: 'savePrompts',
    prompts: {
      standard: standardPrompt,
      withComments: withCommentsPrompt
    }
  }, (saveResponse) => {
    if (saveResponse?.success) {
      chrome.runtime.sendMessage({ action: 'verifyPrompts' }, (response) => {
        testPromptsBtn.disabled = false;

        if (response?.hasCustomPrompts) {
          const statusMsg = `✅ Custom prompts active<br>` +
                          `Standard: ${response.isUsingCustomStandard ? 'Custom' : 'Default'}<br>` +
                          `Smart: ${response.isUsingCustomComments ? 'Custom' : 'Default'}`;
          showStatus(statusMsg, 'success');
        } else {
          showStatus('Using default prompts', 'info');
        }
      });
    } else {
      testPromptsBtn.disabled = false;
      showStatus('Failed to save prompts for testing', 'error');
    }
  });
}

// Show status message
function showStatus(message: string, type: 'success' | 'error' | 'info') {
  if (!settingsStatus) return;

  settingsStatus.innerHTML = message;
  settingsStatus.className = `status-message ${type}`;
  settingsStatus.style.display = 'block';

  // Longer display time for info messages
  const displayTime = type === 'info' ? 5000 : 3000;

  setTimeout(() => {
    if (settingsStatus) {
      settingsStatus.style.display = 'none';
    }
  }, displayTime);
}

// Initialize popup on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log('🚀 ReplyMate popup opened - Enhanced UI');

  // Initial status
  updateModelStatus(ModelStatus.CHECKING, "Initializing ReplyMate...");

  // Setup model selector first
  await setupModelSelector();

  // Load settings
  await loadSettings();

  // Check model status immediately to sync UI
  checkModelStatus();

  // Setup event handlers
  if (modelSelector) {
    modelSelector.addEventListener("change", handleSelectChange);
  }

  if (savePromptsBtn) {
    savePromptsBtn.addEventListener('click', savePrompts);
  }

  if (resetPromptsBtn) {
    resetPromptsBtn.addEventListener('click', resetPrompts);
  }

  if (testPromptsBtn) {
    testPromptsBtn.addEventListener('click', testPrompts);
  }

  if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', checkModelStatus);
  }

  if (reinitModelBtn) {
    reinitModelBtn.addEventListener('click', reinitializeModel);
  }

  // Listen for progress updates from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'modelLoadProgress') {
      handleProgressUpdate(message as LoadingProgress);
    }
  });

  // Notify background that popup is open
  chrome.runtime.sendMessage({ action: 'popupReady' });

  // Auto-check status every 10 seconds while popup is open
  setInterval(() => {
    // Only auto-check if not in loading state
    if (modelStatusBar && !modelStatusBar.classList.contains('loading')) {
      checkModelStatus();
    }
  }, 10000);
});

// Handle progress updates from background
function handleProgressUpdate(update: LoadingProgress) {
  const { progress, message, stage, isFirstLoad } = update;

  // Update status based on stage
  if (stage === 'complete') {
    updateModelStatus(ModelStatus.READY, message, `Model cached for fast loading`);
    updateProgress(100, "100%");
    setTimeout(() => updateProgress(0), 2000);
  } else {
    updateModelStatus(ModelStatus.LOADING, message,
      isFirstLoad ? "⏱️ One-time download • Future loads will be instant" : "⚡ Loading from cache");
    updateProgress(progress, `${progress}%`);
  }

  // Show additional info for first load
  if (isFirstLoad && progress === 0) {
    showStatus('📥 First-time setup: The AI model needs to be downloaded once. After this, it will load instantly from cache!', 'info');
  }
}