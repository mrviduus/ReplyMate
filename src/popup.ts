import { prebuiltAppConfig } from "@mlc-ai/web-llm";

const modelSelector = document.getElementById("model-selection") as HTMLSelectElement;
const modelStatus = document.getElementById("model-status") as HTMLParagraphElement;

// Simple model list
const availableModels = prebuiltAppConfig.model_list.filter(model => 
  model.model_id.includes('Llama-3.2') || 
  model.model_id.includes('Qwen2.5') || 
  model.model_id.includes('gemma-2')
);

// Populate model selector
availableModels.forEach(model => {
  const option = document.createElement("option");
  option.value = model.model_id;
  
  let displayName = model.model_id.split('-')[0];
  if (model.model_id.includes('0.5B')) {
    displayName += " (Fastest)";
  } else if (model.model_id.includes('1B')) {
    displayName += " (Recommended)";
  } else if (model.model_id.includes('3B')) {
    displayName += " (Best Quality)";
  }
  
  option.textContent = displayName;
  modelSelector.appendChild(option);
});

// Check background engine status
chrome.runtime.sendMessage({ action: 'checkEngineStatus' }, (response) => {
  if (response?.engineReady) {
    modelStatus.textContent = "AI is ready for LinkedIn replies";
    modelStatus.style.color = "#28a745";
  } else if (response?.initializing) {
    modelStatus.textContent = "AI is loading... This may take a few minutes";
    modelStatus.style.color = "#ffc107";
  } else {
    modelStatus.textContent = "AI is starting up";
    modelStatus.style.color = "#6c757d";
  }
});

// Handle model selection changes
modelSelector.addEventListener('change', () => {
  const selectedModel = modelSelector.value;
  chrome.runtime.sendMessage({ 
    action: 'changeModel', 
    model: selectedModel 
  }, (response) => {
    if (response?.success) {
      modelStatus.textContent = "Model changed successfully";
      modelStatus.style.color = "#28a745";
    } else {
      modelStatus.textContent = "Failed to change model";
      modelStatus.style.color = "#dc3545";
    }
  });
});
