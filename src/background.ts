import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam, InitProgressReport } from "@mlc-ai/web-llm";

console.log('Background service worker loaded');

// Recommended models for different use cases
const RECOMMENDED_MODELS = [
  "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC", 
  "gemma-2-2b-it-q4f16_1-MLC",
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
];

// Start with fastest model for quick initialization
function getOptimalBackgroundModel(): string {
  return "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
}

// AI engine state
let engine: MLCEngineInterface | null = null;
let engineInitialized = false;
let engineInitializing = false;
let currentModel = getOptimalBackgroundModel();

// Simple prompts for LinkedIn replies
const DEFAULT_PROMPTS = {
  withComments: `Write a professional LinkedIn reply in exactly 1 sentence (maximum 25 words). Be engaging and relevant to the post content. Ask a thoughtful question when possible to encourage discussion.`,
  
  standard: `Write a professional LinkedIn reply in exactly 1 sentence (maximum 25 words). Be supportive, professional, and add value to the conversation. Reference specific details from the original post when possible.`
};

// Get user's custom prompt or use default
async function getUserPrompt(type: 'withComments' | 'standard'): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['customPrompts']);
    const customPrompts = result.customPrompts || {};
    
    if (customPrompts[type] && customPrompts[type].trim().length > 0) {
      return customPrompts[type];
    } else {
      return DEFAULT_PROMPTS[type];
    }
  } catch (error) {
    console.error('Error getting user prompt:', error);
    return DEFAULT_PROMPTS[type];
  }
}

// Initialize AI engine
async function ensureEngine(): Promise<MLCEngineInterface> {
  if (engine && engineInitialized) {
    return engine;
  }
  
  if (engineInitializing) {
    // Wait for existing initialization
    while (engineInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (engine && engineInitialized) {
      return engine;
    }
  }
  
  return initializeEngine();
}

// Initialize the AI engine
async function initializeEngine(): Promise<MLCEngineInterface> {
  if (engineInitializing) {
    throw new Error('Engine already initializing');
  }
  
  engineInitializing = true;
  
  try {
    engine = await CreateMLCEngine(currentModel, {
      initProgressCallback: (report: InitProgressReport) => {
        // Progress updates are sent to popup if needed
      }
    });
    
    engineInitialized = true;
    return engine;
  } catch (error) {
    console.error('Failed to initialize AI engine:', error);
    
    // Try fallback model
    if (currentModel !== "Qwen2.5-0.5B-Instruct-q4f16_1-MLC") {
      currentModel = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
      return initializeEngine();
    }
    throw error;
  } finally {
    engineInitializing = false;
  }
}

// Generate AI reply
async function generateReply(prompt: string, postContent: string): Promise<string> {
  try {
    const aiEngine = await ensureEngine();
    
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system", 
        content: prompt
      },
      {
        role: "user", 
        content: `LinkedIn post content: "${postContent}"`
      }
    ];
    
    const reply = await aiEngine.chat.completions.create({
      messages,
      temperature: 0.7,
      max_tokens: 50, // Keep replies short
    });
    
    return reply.choices[0]?.message?.content || "Great insight! Thanks for sharing.";
  } catch (error) {
    console.error('Error generating reply:', error);
    return "Thanks for sharing this valuable insight!";
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    // Pre-initialize engine for faster first use
    setTimeout(() => {
      initializeEngine().catch(error => {
        console.error('Failed to pre-initialize engine:', error);
      });
    }, 1000);
  }
});

// Message handler for LinkedIn integration
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === 'generateStandardReply') {
    getUserPrompt('standard').then(prompt => {
      return generateReply(prompt, request.postContent);
    }).then(reply => {
      sendResponse({ success: true, reply });
    }).catch(error => {
      console.error('Error in generateStandardReply:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Async response
  }
  
  if (request.action === 'generateSmartReply') {
    getUserPrompt('withComments').then(prompt => {
      // Enhanced prompt with comments context
      const enhancedPrompt = prompt + `\n\nTop comments on this post: ${request.comments?.join('; ') || 'None'}`;
      return generateReply(enhancedPrompt, request.postContent);
    }).then(reply => {
      sendResponse({ success: true, reply });
    }).catch(error => {
      console.error('Error in generateSmartReply:', error);
      sendResponse({ success: false, error: error.message });
    });
    return true; // Async response
  }
  
  if (request.action === 'checkEngineStatus') {
    sendResponse({
      engineReady: engineInitialized,
      initializing: engineInitializing,
      currentModel: currentModel
    });
    return false;
  }
  
  if (request.action === 'changeModel') {
    currentModel = request.model;
    engineInitialized = false;
    engine = null;
    
    // Initialize with new model
    initializeEngine().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Async response
  }
  
  // Custom prompts management
  if (request.action === 'getPrompts') {
    chrome.storage.sync.get(['customPrompts']).then(result => {
      sendResponse({
        prompts: result.customPrompts || {},
        defaults: DEFAULT_PROMPTS
      });
    });
    return true;
  }
  
  if (request.action === 'savePrompts') {
    const prompts = request.prompts;
    if (!prompts || typeof prompts !== 'object') {
      sendResponse({ success: false, error: 'Invalid prompts' });
      return false;
    }
    
    chrome.storage.sync.set({ customPrompts: prompts }).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  if (request.action === 'resetPrompts') {
    chrome.storage.sync.remove(['customPrompts']).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});
