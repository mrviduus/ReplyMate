/**
 * Background Service Worker for ReplyMate
 * Multi-Provider AI Integration
 */

import { ProviderRegistry } from './inference/provider-registry';
import { ProviderStorage } from './services/provider-storage';
import type { InferenceProvider, ProviderType, InferenceResponse } from './inference/inference-provider';

console.log('🚀 ReplyMate Background Service Worker - Multi-Provider Edition');

// Provider management
let currentProvider: InferenceProvider | null = null;
let currentProviderType: ProviderType = 'local';
let providerInitializing = false;
let providerInitialized = false;

// Default prompts for LinkedIn reply generation
const DEFAULT_PROMPTS = {
  standard: `You are an expert LinkedIn engagement specialist. Generate a brief, professional reply to this LinkedIn post.

CRITICAL REQUIREMENTS:
- Maximum 1-2 sentences only
- Be specific to the post content
- Professional tone
- Add value to the conversation
- Natural and conversational
- End with engagement (question/insight)
- NO generic phrases like "Great post!" or "Thanks for sharing!"
- NO excessive enthusiasm or emojis

Post content: {POST_CONTENT}

Generate a brief, engaging reply (1-2 sentences max):`,

  withComments: `You are an expert LinkedIn engagement specialist. Analyze this post and its top comments to generate a contextual reply.

CRITICAL REQUIREMENTS:
- Maximum 1-2 sentences only
- Reference specific points from the post
- Build on the discussion
- Professional tone
- Add unique value
- Natural and conversational
- NO generic phrases
- NO excessive enthusiasm

Post content: {POST_CONTENT}

Top comments for context:
{COMMENTS}

Generate a brief, contextual reply that adds value (1-2 sentences max):`
};

// Custom prompts storage
let customPrompts = {
  standard: '',
  withComments: ''
};

/**
 * Initialize the selected provider
 */
async function initializeProvider(type?: ProviderType): Promise<boolean> {
  if (providerInitializing) {
    console.log('Provider initialization already in progress');
    return false;
  }

  providerInitializing = true;
  providerInitialized = false;

  try {
    // Get provider settings
    const settings = await ProviderStorage.getSettings();
    const providerType = type || (settings as any).provider || 'local';

    console.log(`Initializing provider: ${providerType}`);
    currentProviderType = providerType as ProviderType;

    // Clean up existing provider
    if (currentProvider) {
      await currentProvider.dispose();
      currentProvider = null;
    }

    // Create new provider instance using getProviderClass
    const ProviderClass = ProviderRegistry.getProviderClass(providerType as ProviderType);

    currentProvider = new ProviderClass({
      model: (settings as any).model,
      temperature: (settings as any).temperature || 0.7,
      maxTokens: (settings as any).maxTokens || 150
    });

    // Initialize provider
    if (providerType !== 'local') {
      // External providers need API key
      const apiKey = providerType === 'local' ? null : await ProviderStorage.getApiKey(providerType as 'claude' | 'openai' | 'gemini');
      if (!apiKey) {
        throw new Error(`API key required for ${providerType}`);
      }

      // Set API key in provider config
      (currentProvider as any).apiKey = apiKey;
    }

    await currentProvider!.initialize();
    providerInitialized = true;

    console.log(`✅ Provider ${providerType} initialized successfully`);
    return true;

  } catch (error) {
    console.error('Failed to initialize provider:', error);
    currentProvider = null;
    providerInitialized = false;
    throw error;
  } finally {
    providerInitializing = false;
  }
}

/**
 * Generate a reply using the current provider
 */
async function generateReply(systemPrompt: string, userPrompt: string): Promise<InferenceResponse> {
  if (!currentProvider || !providerInitialized) {
    // Try to initialize with default provider
    await initializeProvider();
  }

  if (!currentProvider) {
    throw new Error('No AI provider available');
  }

  try {
    const response = await currentProvider.generateReply(systemPrompt, userPrompt);
    return response;
  } catch (error) {
    console.error('Reply generation failed:', error);

    // If local provider fails, we could try fallback to another provider
    if (currentProviderType === 'local') {
      console.log('Attempting to reinitialize local provider...');
      await initializeProvider('local');

      // Retry once
      if (currentProvider) {
        return await currentProvider.generateReply(systemPrompt, userPrompt);
      }
    }

    throw error;
  }
}

/**
 * Message handler for popup and content scripts
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations
  (async () => {
    try {
      switch (message.action) {
        // Provider management
        case 'switchProvider': {
          const success = await initializeProvider(message.provider);
          sendResponse({ success, provider: currentProviderType });
          break;
        }

        case 'initializeProvider': {
          const success = await initializeProvider(message.provider);
          sendResponse({ success });
          break;
        }

        case 'validateApiKey': {
          try {
            const ProviderClass = ProviderRegistry.getProviderClass(message.provider);
            const provider = new ProviderClass({});
            (provider as any).apiKey = message.apiKey;

            // Try to validate by initializing
            await provider.initialize();
            await provider.dispose();

            sendResponse({ valid: true });
          } catch (error) {
            sendResponse({
              valid: false,
              error: error instanceof Error ? error.message : 'Invalid API key'
            });
          }
          break;
        }

        case 'testProvider': {
          try {
            const ProviderClass = ProviderRegistry.getProviderClass(message.provider);
            const provider = new ProviderClass({});
            if (message.apiKey) {
              (provider as any).apiKey = message.apiKey;
            }

            await provider.initialize();
            const response = await provider.generateReply(
              'You are a helpful assistant.',
              'Say "Hello! Connection successful!" in exactly those words.'
            );
            await provider.dispose();

            sendResponse({
              success: true,
              model: provider.getModelName(),
              response: response.reply
            });
          } catch (error) {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Connection test failed'
            });
          }
          break;
        }

        case 'checkEngineStatus': {
          sendResponse({
            engineReady: providerInitialized,
            initializing: providerInitializing,
            provider: currentProviderType,
            currentModel: currentProvider?.getModelName() || '',
            cached: currentProviderType === 'local' // Local provider uses caching
          });
          break;
        }

        // Reply generation
        case 'generateReply': {
          if (!providerInitialized) {
            await initializeProvider();
          }

          const { postContent, comments, useSmartReply } = message;

          // Select appropriate prompt
          const promptTemplate = useSmartReply && comments?.length > 0
            ? (customPrompts.withComments || DEFAULT_PROMPTS.withComments)
            : (customPrompts.standard || DEFAULT_PROMPTS.standard);

          // Prepare the prompt
          let userPrompt = promptTemplate.replace('{POST_CONTENT}', postContent);

          if (useSmartReply && comments?.length > 0) {
            const topComments = comments.slice(0, 3)
              .map((c: any, i: number) => `${i + 1}. ${c.text}`)
              .join('\n');
            userPrompt = userPrompt.replace('{COMMENTS}', topComments);
          }

          // System prompt for consistency
          const systemPrompt = 'You are a professional LinkedIn user. Generate concise, engaging replies that add value to professional discussions. Keep responses to 1-2 sentences maximum.';

          try {
            const response = await generateReply(systemPrompt, userPrompt);

            sendResponse({
              success: true,
              reply: response.reply,
              provider: response.provider,
              model: response.model,
              latency: response.latency
            });
          } catch (error) {
            console.error('Failed to generate reply:', error);
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to generate reply'
            });
          }
          break;
        }

        // Prompt management
        case 'savePrompts': {
          customPrompts = message.prompts || {};
          await chrome.storage.local.set({ customPrompts });
          sendResponse({ success: true });
          break;
        }

        case 'getPrompts': {
          const stored = await chrome.storage.local.get('customPrompts');
          sendResponse({
            prompts: stored.customPrompts || {},
            defaults: DEFAULT_PROMPTS
          });
          break;
        }

        case 'resetPrompts': {
          customPrompts = { standard: '', withComments: '' };
          await chrome.storage.local.set({ customPrompts });
          sendResponse({ success: true });
          break;
        }

        case 'verifyPrompts': {
          const hasCustom = !!(customPrompts.standard || customPrompts.withComments);
          sendResponse({
            hasCustomPrompts: hasCustom,
            isUsingCustomStandard: !!customPrompts.standard,
            isUsingCustomComments: !!customPrompts.withComments
          });
          break;
        }

        // Model management (Local provider specific)
        case 'updateModel': {
          if (currentProviderType === 'local' && message.model) {
            await ProviderStorage.saveSettings({ models: [message.model] } as any);
            await initializeProvider('local');
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Model update only available for WebLLM' });
          }
          break;
        }

        case 'getModelsInfo': {
          if (currentProviderType === 'local') {
            // Local provider model list handling
            sendResponse({
              models: [
                { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B' },
                { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2 2B' },
                { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC', name: 'Phi 3.5 Mini' },
                { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 0.5B' }
              ]
            });
          } else {
            sendResponse({ models: [] });
          }
          break;
        }

        case 'popupReady': {
          console.log('Popup opened, provider status:', {
            type: currentProviderType,
            initialized: providerInitialized
          });
          sendResponse({ success: true });
          break;
        }

        default: {
          console.warn('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
        }
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })();

  // Return true to indicate async response
  return true;
});

// Initialize on startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ReplyMate installed/updated - Initializing provider system');

  // Load custom prompts
  const stored = await chrome.storage.local.get('customPrompts');
  if (stored.customPrompts) {
    customPrompts = stored.customPrompts;
  }

  // Initialize default provider
  try {
    await initializeProvider();
  } catch (error) {
    console.error('Failed to initialize default provider on install:', error);
  }
});

// Handle service worker activation
chrome.runtime.onStartup.addListener(async () => {
  console.log('ReplyMate service worker started');

  // Load custom prompts
  const stored = await chrome.storage.local.get('customPrompts');
  if (stored.customPrompts) {
    customPrompts = stored.customPrompts;
  }

  // Initialize default provider
  try {
    await initializeProvider();
  } catch (error) {
    console.error('Failed to initialize default provider on startup:', error);
  }
});

// Keep service worker alive
const keepAlive = () => setInterval(chrome.runtime.getPlatformInfo, 20e3);
chrome.runtime.onStartup.addListener(keepAlive);
keepAlive();

console.log('✅ ReplyMate Multi-Provider Background Service Ready');