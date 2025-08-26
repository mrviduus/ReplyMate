/* eslint-disable @typescript-eslint/no-non-null-assertion */
"use strict";

// This code is partially adapted from the openai-chatgpt-chrome-extension repo:
// https://github.com/jessedi0n/openai-chatgpt-chrome-extension

import "./popup.css";

import {
  MLCEngineInterface,
  InitProgressReport,
  CreateMLCEngine,
  ChatCompletionMessageParam,
  prebuiltAppConfig,
} from "@mlc-ai/web-llm";
import * as ProgressBar from "progressbar.js";

// modified setLabel to not throw error
function setLabel(id: string, text: string) {
  const label = document.getElementById(id);
  if (label != null) {
    label.innerText = text;
  }
}

function getElementAndCheck(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element == null) {
    throw Error("Cannot find element " + id);
  }
  return element;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const queryInput = getElementAndCheck("query-input")!;
const submitButton = getElementAndCheck("submit-button")!;
const modelName = getElementAndCheck("model-name");

let context = "";
let modelDisplayName = "";

// throws runtime.lastError if you refresh extension AND try to access a webpage that is already open
fetchPageContents();

(<HTMLButtonElement>submitButton).disabled = true;

let progressBar = new ProgressBar.Line("#loadingContainer", {
  strokeWidth: 4,
  easing: "easeInOut",
  duration: 1400,
  color: "#ffd166",
  trailColor: "#eee",
  trailWidth: 1,
  svgStyle: { width: "100%", height: "100%" },
});

let isLoadingParams = true;

let initProgressCallback = (report: InitProgressReport) => {
  setLabel("init-label", report.text);
  progressBar.animate(report.progress, {
    duration: 50,
  });
  if (report.progress == 1.0) {
    enableInputs();
  }
};

// initially selected model
let selectedModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

// populate model-selection
const modelSelector = getElementAndCheck(
  "model-selection",
) as HTMLSelectElement;
for (let i = 0; i < prebuiltAppConfig.model_list.length; ++i) {
  const model = prebuiltAppConfig.model_list[i];
  const opt = document.createElement("option");
  opt.value = model.model_id;
  opt.innerHTML = model.model_id;
  opt.selected = false;

  // set initial selection as the initially selected model
  if (model.model_id == selectedModel) {
    opt.selected = true;
  }

  modelSelector.appendChild(opt);
}

modelName.innerText = "Loading initial model...";
// Remove direct engine initialization - will be done in DOMContentLoaded
let engine: MLCEngineInterface;

let chatHistory: ChatCompletionMessageParam[] = [];

function enableInputs() {
  if (isLoadingParams) {
    sleep(500);
    isLoadingParams = false;
  }

  // remove loading bar and loading bar descriptors, if exists
  const initLabel = document.getElementById("init-label");
  initLabel?.remove();
  const loadingBarContainer = document.getElementById("loadingContainer")!;
  loadingBarContainer?.remove();
  queryInput.focus();

  const modelNameArray = selectedModel.split("-");
  modelDisplayName = modelNameArray[0];
  let j = 1;
  while (j < modelNameArray.length && modelNameArray[j][0] != "q") {
    modelDisplayName = modelDisplayName + "-" + modelNameArray[j];
    j++;
  }
}

let requestInProgress = false;

// Disable submit button if input field is empty
queryInput.addEventListener("keyup", () => {
  if (
    (<HTMLInputElement>queryInput).value === "" ||
    requestInProgress ||
    isLoadingParams
  ) {
    (<HTMLButtonElement>submitButton).disabled = true;
  } else {
    (<HTMLButtonElement>submitButton).disabled = false;
  }
});

// If user presses enter, click submit button
queryInput.addEventListener("keyup", (event) => {
  if (event.code === "Enter") {
    event.preventDefault();
    submitButton.click();
  }
});

// Listen for clicks on submit button
async function handleClick() {
  const popupEngine = (window as any).popupEngine;
  if (!popupEngine) {
    updateAnswer("Chat AI not ready. Please wait for initialization to complete.");
    return;
  }

  requestInProgress = true;
  (<HTMLButtonElement>submitButton).disabled = true;

  // Get the message from the input field
  const message = (<HTMLInputElement>queryInput).value;
  console.log("message", message);
  // Clear the answer
  document.getElementById("answer")!.innerHTML = "";
  // Hide the answer
  document.getElementById("answerWrapper")!.style.display = "none";
  // Show the loading indicator
  document.getElementById("loading-indicator")!.style.display = "block";

  // Generate response
  let inp = message;
  if (context.length > 0) {
    inp =
      "Use only the following context when answering the question at the end. Don't use any other knowledge.\n" +
      context +
      "\n\nQuestion: " +
      message +
      "\n\nHelpful Answer: ";
  }
  console.log("Input:", inp);
  chatHistory.push({ role: "user", content: inp });

  let curMessage = "";
  const completion = await popupEngine.chat.completions.create({
    stream: true,
    messages: chatHistory,
  });
  for await (const chunk of completion) {
    const curDelta = chunk.choices[0].delta.content;
    if (curDelta) {
      curMessage += curDelta;
    }
    updateAnswer(curMessage);
  }
  const response = await popupEngine.getMessage();
  chatHistory.push({ role: "assistant", content: await popupEngine.getMessage() });
  console.log("response", response);

  requestInProgress = false;
  (<HTMLButtonElement>submitButton).disabled = false;
}
submitButton.addEventListener("click", handleClick);

// listen for changes in modelSelector
async function handleSelectChange() {
  if (isLoadingParams) {
    return;
  }

  const popupEngine = (window as any).popupEngine;
  if (!popupEngine) {
    console.error('Popup engine not available');
    return;
  }

  modelName.innerText = "";

  const initLabel = document.createElement("p");
  initLabel.id = "init-label";
  initLabel.innerText = "Initializing model...";
  const loadingContainer = document.createElement("div");
  loadingContainer.id = "loadingContainer";

  const loadingBox = getElementAndCheck("loadingBox");
  loadingBox.appendChild(initLabel);
  loadingBox.appendChild(loadingContainer);

  isLoadingParams = true;
  (<HTMLButtonElement>submitButton).disabled = true;

  if (requestInProgress) {
    popupEngine.interruptGenerate();
  }
  popupEngine.resetChat();
  chatHistory = [];
  await popupEngine.unload();

  selectedModel = modelSelector.value;

  progressBar = new ProgressBar.Line("#loadingContainer", {
    strokeWidth: 4,
    easing: "easeInOut",
    duration: 1400,
    color: "#ffd166",
    trailColor: "#eee",
    trailWidth: 1,
    svgStyle: { width: "100%", height: "100%" },
  });

  initProgressCallback = (report: InitProgressReport) => {
    setLabel("init-label", report.text);
    progressBar.animate(report.progress, {
      duration: 50,
    });
    if (report.progress == 1.0) {
      enableInputs();
    }
  };

  popupEngine.setInitProgressCallback(initProgressCallback);

  requestInProgress = true;
  modelName.innerText = "Reloading with new model...";
  await popupEngine.reload(selectedModel);
  requestInProgress = false;
  modelName.innerText = "Now chatting with " + modelDisplayName;
}
modelSelector.addEventListener("change", handleSelectChange);

// Listen for messages from the background script and LinkedIn content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.answer) {
    updateAnswer(request.answer);
  }
  
  if (request.action === 'generateLinkedInReply') {
    // Forward to background service worker which handles AI generation
    chrome.runtime.sendMessage({
      action: 'generateLinkedInReply',
      postContent: request.postContent
    }, (response) => {
      sendResponse(response);
    });
    return true; // Keep channel open for async response
  }
});

// Check and display background engine status on popup load
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize tab functionality
  initializeTabs();
  
  // Initialize settings functionality
  await initializeSettings();

  // Check if background engine is available
  chrome.runtime.sendMessage({ action: 'checkEngineStatus' }, (response) => {
    if (response?.engineReady) {
      // Background AI is ready, we can use it for both chat and LinkedIn
      console.log('Background AI engine is ready');
    } else if (response?.initializing) {
      console.log('Background AI engine is initializing...');
      setLabel("model-name", "AI is initializing in background...");
    } else {
      console.log('Background AI engine not ready, will use popup AI for chat');
    }
  });
  
  // Initialize popup AI engine for chat functionality
  await initializePopupEngine();
  
  // Add keyboard shortcuts for closing popup
  document.addEventListener('keydown', (e) => {
    // Close on Escape key
    if (e.key === 'Escape') {
      console.log('Closing popup with Escape key...');
      window.close();
    }
    
    // Close on Ctrl/Cmd + W
    if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
      e.preventDefault();
      console.log('Closing popup with Ctrl/Cmd+W...');
      window.close();
    }
  });
});

// Initialize tab switching functionality
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const targetTab = button.getAttribute('data-tab');
      
      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      document.getElementById(`${targetTab}-tab`)?.classList.add('active');
      
      // Load settings when switching to settings tab
      if (targetTab === 'settings') {
        const loadSettingsTab = (window as any).loadSettingsTab;
        if (loadSettingsTab) {
          await loadSettingsTab();
        }
      }
    });
  });
}

// Initialize settings functionality
async function initializeSettings() {
  const standardPromptTextarea = document.getElementById('standardPrompt') as HTMLTextAreaElement;
  const withCommentsPromptTextarea = document.getElementById('withCommentsPrompt') as HTMLTextAreaElement;
  const saveButton = document.getElementById('savePrompts');
  const resetButton = document.getElementById('resetPrompts');
  const testButton = document.getElementById('testPrompts');
  const statusMessage = document.getElementById('settingsStatus');

  // Load current prompts initially
  await loadPrompts();

  // Save prompts functionality
  saveButton?.addEventListener('click', async () => {
    const prompts = {
      standard: standardPromptTextarea.value,
      withComments: withCommentsPromptTextarea.value
    };
    
    // Debug logging
    console.log('🎛️ POPUP: Attempting to save prompts:', prompts);
    console.log('📏 Standard prompt length:', prompts.standard.length);
    console.log('📏 WithComments prompt length:', prompts.withComments.length);
    
    // Disable button during save
    const saveBtn = saveButton as HTMLButtonElement;
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
    
    try {
      await savePrompts(prompts);
      console.log('✅ POPUP: Save operation completed successfully');
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      console.error('❌ POPUP: Failed to save prompts:', error);
      showStatus('Failed to save settings', 'error');
    } finally {
      // Re-enable button
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  });

  // Reset prompts functionality
  resetButton?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset to default prompts?')) {
      // Disable button during reset
      const resetBtn = resetButton as HTMLButtonElement;
      const originalText = resetBtn.innerHTML;
      resetBtn.disabled = true;
      resetBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Resetting...';
      
      try {
        await resetPrompts();
        await loadPrompts();
        showStatus('Reset to default prompts', 'success');
      } catch (error) {
        console.error('Failed to reset prompts:', error);
        showStatus('Failed to reset settings', 'error');
      } finally {
        // Re-enable button
        resetBtn.disabled = false;
        resetBtn.innerHTML = originalText;
      }
    }
  });

  // Test prompts functionality
  testButton?.addEventListener('click', async () => {
    const testBtn = testButton as HTMLButtonElement;
    const originalText = testBtn.innerHTML;
    testBtn.disabled = true;
    testBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Testing...';
    
    try {
      // Test if prompts are properly stored and retrieved
      console.log('🧪 Testing custom prompts...');
      
      // First, get current prompts from storage
      const response = await sendMessageAsync({ action: 'getPrompts' });
      console.log('📖 Test - Storage response:', response);
      
      const customPrompts = response.prompts || {};
      const hasCustomStandard = !!customPrompts.standard;
      const hasCustomComments = !!customPrompts.withComments;
      
      let testResult = '🧪 Test Results:\n';
      testResult += hasCustomStandard ? '✅ Custom standard prompt found\n' : '❌ No custom standard prompt\n';
      testResult += hasCustomComments ? '✅ Custom comments prompt found\n' : '❌ No custom comments prompt\n';
      
      if (hasCustomStandard || hasCustomComments) {
        testResult += '\n🎯 Custom prompts are working!';
        showStatus('Custom prompts test passed!', 'success');
      } else {
        testResult += '\n⚠️ No custom prompts found. Save some first!';
        showStatus('No custom prompts to test', 'error');
      }
      
      console.log(testResult);
      
      // Show detailed info
      if (customPrompts.standard) {
        console.log('📝 Custom standard preview:', customPrompts.standard.substring(0, 100) + '...');
      }
      if (customPrompts.withComments) {
        console.log('📝 Custom comments preview:', customPrompts.withComments.substring(0, 100) + '...');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      showStatus('Test failed - check console', 'error');
    } finally {
      testBtn.disabled = false;
      testBtn.innerHTML = originalText;
    }
  });

  // Helper functions
  async function loadPrompts() {
    const settingsLoading = document.getElementById('settingsLoading');
    const settingsContent = document.getElementById('settingsContent');
    
    try {
      // Show loading state
      if (settingsLoading) settingsLoading.style.display = 'flex';
      if (settingsContent) settingsContent.style.opacity = '0.5';
      
      console.log('🔄 POPUP: Loading prompts from storage...');
      const response = await sendMessageAsync({ action: 'getPrompts' });
      console.log('📦 POPUP: Received response:', response);
      
      const prompts = response.prompts || {};
      const defaults = response.defaults || {};
      
      // Set values and log what we're setting
      const standardValue = prompts.standard || defaults.standard || '';
      const commentsValue = prompts.withComments || defaults.withComments || '';
      
      console.log('🎯 POPUP: Setting standard prompt:', standardValue.substring(0, 100) + '...');
      console.log('🎯 POPUP: Setting comments prompt:', commentsValue.substring(0, 100) + '...');
      
      standardPromptTextarea.value = standardValue;
      withCommentsPromptTextarea.value = commentsValue;
      
      // Verify values were set
      console.log('✅ POPUP: Standard textarea value length:', standardPromptTextarea.value.length);
      console.log('✅ POPUP: Comments textarea value length:', withCommentsPromptTextarea.value.length);
      
      // Update placeholders to show they're loaded
      standardPromptTextarea.placeholder = 'Enter your custom standard reply prompt...';
      withCommentsPromptTextarea.placeholder = 'Enter your custom smart reply prompt...';
      
      // Add visual indicator for custom prompts
      const standardLabel = document.querySelector('label[for="standardPrompt"]');
      const commentsLabel = document.querySelector('label[for="withCommentsPrompt"]');
      
      if (prompts.standard && standardLabel) {
        standardLabel.innerHTML = '<i class="fa fa-check-circle" style="color: #4caf50;"></i> Standard Reply Prompt (Custom Active)';
        console.log('✅ POPUP: Using CUSTOM standard prompt');
      } else if (standardLabel) {
        standardLabel.innerHTML = '<i class="fa fa-comment"></i> Standard Reply Prompt (Default)';
        console.log('ℹ️ POPUP: Using DEFAULT standard prompt');
      }
      
      if (prompts.withComments && commentsLabel) {
        commentsLabel.innerHTML = '<i class="fa fa-check-circle" style="color: #4caf50;"></i> Smart Reply Prompt (Custom Active)';
        console.log('✅ POPUP: Using CUSTOM withComments prompt');
      } else if (commentsLabel) {
        commentsLabel.innerHTML = '<i class="fa fa-chart-line"></i> Smart Reply Prompt (Default)';
        console.log('ℹ️ POPUP: Using DEFAULT withComments prompt');
      }
      
    } catch (error) {
      console.error('❌ POPUP: Failed to load prompts:', error);
      showStatus('Failed to load settings', 'error');
    } finally {
      // Hide loading state
      if (settingsLoading) settingsLoading.style.display = 'none';
      if (settingsContent) settingsContent.style.opacity = '1';
    }
  }

  async function savePrompts(prompts: any) {
    return await sendMessageAsync({ 
      action: 'savePrompts', 
      prompts: prompts 
    });
  }

  async function resetPrompts() {
    return await sendMessageAsync({ action: 'resetPrompts' });
  }

  // Show status message function
  function showStatus(message: string, type: 'success' | 'error') {
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.className = `status-message ${type}`;
      
      setTimeout(() => {
        statusMessage.className = 'status-message';
      }, 3000);
    }
  }

  // Export loadPrompts for tab switching
  (window as any).loadSettingsTab = loadPrompts;
}

// Helper function to promisify chrome.runtime.sendMessage
function sendMessageAsync(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response?.success !== undefined && !response.success) {
        reject(new Error('Operation failed'));
      } else {
        resolve(response);
      }
    });
  });
}

// Initialize the popup AI engine for chat functionality
async function initializePopupEngine() {
  try {
    modelName.innerText = "Loading chat model...";
    const engine: MLCEngineInterface = await CreateMLCEngine(selectedModel, {
      initProgressCallback: initProgressCallback,
    });
    modelName.innerText = "Now chatting with " + modelDisplayName;
    
    // Store engine globally for chat functionality
    (window as any).popupEngine = engine;
    
  } catch (error) {
    console.error('Failed to initialize popup engine:', error);
    modelName.innerText = "Failed to load chat model";
  }
}

function updateAnswer(answer: string) {
  // Show answer
  document.getElementById("answerWrapper")!.style.display = "block";
  const answerWithBreaks = answer.replace(/\n/g, "<br>");
  document.getElementById("answer")!.innerHTML = answerWithBreaks;
  
  // Add event listener to copy button
  const copyButton = document.getElementById("copyAnswer")!;
  // Remove any existing event listeners
  copyButton.replaceWith(copyButton.cloneNode(true));
  const newCopyButton = document.getElementById("copyAnswer")!;
  
  newCopyButton.addEventListener("click", () => {
    // Get the answer text
    const answerText = answer;
    // Copy the answer text to the clipboard
    navigator.clipboard
      .writeText(answerText)
      .then(() => {
        console.log("Answer text copied to clipboard");
        // Show visual feedback
        const icon = newCopyButton.querySelector("i")!;
        icon.className = "fa-solid fa-check fa-lg";
        setTimeout(() => {
          icon.className = "fa-solid fa-copy fa-lg";
        }, 2000);
      })
      .catch((err) => console.error("Could not copy text: ", err));
  });

  // Add close button if it doesn't exist
  let closeButton = document.getElementById("closePopup");
  if (!closeButton) {
    closeButton = document.createElement("button");
    closeButton.id = "closePopup";
    closeButton.className = "btn closeButton";
    closeButton.title = "Close popup";
    closeButton.innerHTML = '<i class="fa-solid fa-times fa-lg"></i>';
    
    // Add the close button to the copyRow
    const copyRow = document.querySelector(".copyRow")!;
    copyRow.appendChild(closeButton);
  }
  
  // Add event listener to close button
  closeButton.replaceWith(closeButton.cloneNode(true));
  const newCloseButton = document.getElementById("closePopup")!;
  
  newCloseButton.addEventListener("click", () => {
    console.log("Closing popup...");
    window.close();
  });

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  const time = new Date().toLocaleString("en-US", options);
  // Update timestamp
  document.getElementById("timestamp")!.innerText = time;
  // Hide loading indicator
  document.getElementById("loading-indicator")!.style.display = "none";
}

function fetchPageContents() {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    if (tabs[0]?.id !== undefined) {
      const port = chrome.tabs.connect(tabs[0].id, { name: "channelName" });
      port.postMessage({});
      port.onMessage.addListener(function (msg) {
        console.log("Page contents:", msg.contents);
        context = msg.contents;
      });
    }
  });
}
