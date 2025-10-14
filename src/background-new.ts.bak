import { ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import { ProviderRegistry, ProviderType, InferenceProvider } from './inference/provider-registry';

console.log('Background service worker loaded');

// Current provider and instance
let currentProvider: InferenceProvider | null = null;
let currentProviderType: ProviderType = 'webllm'; // Default to local AI
let providerInitializing = false;
let providerInitialized = false;

// Enhanced default prompts for better LinkedIn engagement
const DEFAULT_PROMPTS = {
  withComments: `You are a LinkedIn engagement expert. Respond DIRECTLY with the reply text only - no preambles, no explanations.

CRITICAL: Output 1-2 impactful sentences (maximum 40 words total). Start immediately with your response.

SMART ANALYSIS:
- Study the top-performing comments' tone, style, and engagement patterns
- Identify what makes them successful: specific insights, relatable experiences, thought-provoking questions, or timely perspectives
- Notice if they use data, personal anecdotes, industry insights, or call-to-action phrases

YOUR REPLY STRATEGY:
- Match the energy level of top comments while adding your unique perspective
- If top comments ask questions → ask a related but different question
- If top comments share experiences → reference a contrasting or complementary experience
- If top comments provide insights → add supporting data or a fresh angle
- Use power words that drive engagement: "Actually...", "Interestingly...", "What if...", "I've found..."

ENGAGEMENT MULTIPLIERS:
- End with a question when possible (drives responses)
- Reference specific details from the original post
- Use "we" language to create community feeling
- Be conversational but professional`,

  standard: `You are a LinkedIn expert. Respond DIRECTLY with the reply text only - no preambles, no explanations.

CRITICAL: Output 1-2 impactful sentences (maximum 40 words total). Start immediately with your response.

HIGH-IMPACT REPLY FORMULA:
1. Hook: Start with something attention-grabbing ("Actually...", "This reminds me...", "What's interesting...")
2. Value: Add genuine insight, experience, or perspective
3. Connection: End with a question or call-to-action when appropriate

PROVEN ENGAGEMENT PATTERNS:
- Share a micro-insight: "I've seen this approach increase results by 40% in my experience."
- Ask a strategic question: "What's been your biggest challenge implementing this strategy?"
- Provide a contrasting view: "While I agree, I'd add that timing is equally crucial here."
- Reference specific data/experience: "This aligns with the 70% increase we saw after..."

PROFESSIONAL TONE GUIDE:
- Confident but not arrogant
- Helpful but not promotional
- Personal but not oversharing
- Engaging but not casual

AVOID:
- Generic praise ("Great post!", "Thanks for sharing!")
- Multiple sentences or explanations
- Obvious statements everyone would agree with
- Self-promotional content`
};

// Get provider configuration from storage
async function getProviderConfig(): Promise<{
  type: ProviderType;
  apiKey?: string;
  model?: string;
}> {
  try {
    const result = await chrome.storage.sync.get(['providerType', 'providerApiKey', 'providerModel']);

    return {
      type: (result.providerType as ProviderType) || 'webllm',
      apiKey: result.providerApiKey,
      model: result.providerModel
    };
  } catch (error) {
    console.error('Failed to get provider config:', error);
    return { type: 'webllm' }; // Default to local AI
  }
}

// Save provider configuration
async function saveProviderConfig(config: {
  type: ProviderType;
  apiKey?: string;
  model?: string;
}) {
  try {
    await chrome.storage.sync.set({
      providerType: config.type,
      providerApiKey: config.apiKey || '',
      providerModel: config.model || ''
    });
  } catch (error) {
    console.error('Failed to save provider config:', error);
  }
}

// Get user's custom prompt or use default
async function getUserPrompt(type: 'withComments' | 'standard'): Promise<string> {
  console.log(`🔍 getUserPrompt called for type: ${type}`);

  try {
    // Always check storage first
    const result = await chrome.storage.sync.get(['customPrompts']);
    console.log('📦 Storage result:', result);

    const customPrompts = result.customPrompts || {};

    // Check if custom prompt exists and is not empty
    if (customPrompts[type] && customPrompts[type].trim().length > 0) {
      console.log(`✅ Using CUSTOM prompt for ${type}`);
      console.log(`📝 Custom prompt preview: ${customPrompts[type].substring(0, 150)}...`);
      return customPrompts[type];
    } else {
      console.log(`⚠️ No custom prompt found for ${type}, using DEFAULT`);
      console.log(`📝 Default prompt preview: ${DEFAULT_PROMPTS[type].substring(0, 150)}...`);
      return DEFAULT_PROMPTS[type];
    }
  } catch (error) {
    console.error('❌ Error getting user prompt:', error);
    console.log('⚠️ Falling back to default prompt due to error');
    return DEFAULT_PROMPTS[type];
  }
}

// Initialize provider based on configuration
async function ensureProvider(): Promise<InferenceProvider> {
  if (currentProvider && providerInitialized) {
    return currentProvider;
  }

  if (providerInitializing) {
    console.log('🔄 Provider already initializing, waiting...');
    // Wait for initialization to complete with timeout
    let attempts = 0;
    while (providerInitializing && attempts < 60) { // 30 seconds max
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (currentProvider && providerInitialized) {
      return currentProvider;
    } else {
      throw new Error('Provider initialization timed out or failed');
    }
  }

  providerInitializing = true;
  console.log(`🚀 Initializing provider`);

  try {
    // Get provider configuration
    const config = await getProviderConfig();
    currentProviderType = config.type;

    console.log(`🔧 Initializing ${config.type} provider`);

    // Send initial loading message
    sendProgressToAllTabs({
      type: 'modelLoadProgress',
      progress: 0,
      message: `Initializing ${config.type === 'webllm' ? 'local AI' : config.type.toUpperCase()} provider...`,
      stage: 'initializing',
      provider: config.type
    });

    // Create provider instance
    currentProvider = ProviderRegistry.create(config.type, {
      apiKey: config.apiKey,
      model: config.model,
      onProgress: (progress: number, message: string) => {
        sendProgressToAllTabs({
          type: 'modelLoadProgress',
          progress: Math.round(progress * 100),
          message,
          stage: progress < 0.5 ? 'downloading' : progress < 0.8 ? 'loading' : 'finalizing',
          provider: config.type
        });
      }
    });

    // Initialize the provider
    await currentProvider.initialize();

    providerInitialized = true;
    providerInitializing = false;

    // Send completion message
    sendProgressToAllTabs({
      type: 'modelLoadProgress',
      progress: 100,
      message: `✅ ${currentProvider.getProviderName()} ready!`,
      stage: 'complete',
      provider: config.type
    });

    console.log(`✅ Provider ${config.type} ready!`);
    return currentProvider;
  } catch (error) {
    providerInitializing = false;
    providerInitialized = false;
    currentProvider = null;
    console.error(`❌ Failed to initialize provider:`, error);

    // If external provider fails, fall back to local AI
    if (currentProviderType !== 'webllm') {
      console.log('🔄 Falling back to local AI...');
      currentProviderType = 'webllm';
      await saveProviderConfig({ type: 'webllm' });
      return ensureProvider(); // Retry with local AI
    }

    throw error;
  }
}

// Helper function to send messages to all tabs
function sendProgressToAllTabs(message: any) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Ignore errors for tabs that don't have content scripts
        });
      }
    });
  });

  // Also try to send to popup if open
  try {
    chrome.runtime.sendMessage(message);
  } catch (e) {
    // Ignore if no listeners
  }
}

// Add a health check function
async function performHealthCheck(): Promise<boolean> {
  try {
    if (!providerInitialized || !currentProvider) {
      console.log('🏥 Health check: Provider not ready');
      return false;
    }

    if (!currentProvider.isReady()) {
      console.log('🏥 Health check: Provider not ready');
      return false;
    }

    console.log('🏥 Health check: Provider appears healthy');
    return true;
  } catch (error) {
    console.error('🏥 Health check failed:', error);
    // Reset provider state to trigger re-initialization
    providerInitialized = false;
    currentProvider = null;
    return false;
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  chrome.storage.local.set({ hasUsedExtension: true });

  // Reset initialization state on fresh install
  if (details.reason === 'install') {
    providerInitialized = false;
    providerInitializing = false;
  }

  // Pre-initialize the provider after installation with error handling
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('🚀 Pre-initializing provider after', details.reason);
    ensureProvider().catch(error => {
      console.error('Failed to pre-initialize provider:', error);
      // Store the error for debugging
      chrome.storage.local.set({
        lastInitError: {
          message: error.message,
          timestamp: Date.now()
        }
      });
    });
  }
});

// Message handler for LinkedIn reply generation and provider management
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔵 Background received message:', request.action);

  // Pre-initialize provider when LinkedIn content script loads
  if (request.action === 'linkedinContentScriptReady') {
    console.log('🚀 LinkedIn detected, pre-initializing provider...');
    ensureProvider()
      .then((provider) => {
        console.log('✅ Provider pre-initialized for LinkedIn');
        sendResponse({
          engineReady: true,
          provider: currentProviderType,
          providerName: provider.getProviderName(),
          model: provider.getModelName()
        });
      })
      .catch(error => {
        console.error('❌ Failed to pre-initialize provider:', error);
        sendResponse({
          engineReady: false,
          error: error.message,
          provider: currentProviderType
        });
      });
    return true; // Keep channel open for async response
  }

  // Handle provider configuration
  if (request.action === 'getProviderConfig') {
    getProviderConfig().then(config => {
      sendResponse(config);
    });
    return true;
  }

  if (request.action === 'switchProvider') {
    const { type, apiKey, model } = request;

    // Validate API key if switching to external provider
    if (type !== 'webllm' && !apiKey) {
      sendResponse({ success: false, error: 'API key required for external providers' });
      return false;
    }

    // Save new configuration
    saveProviderConfig({ type, apiKey, model }).then(() => {
      // Reset current provider
      if (currentProvider) {
        currentProvider.dispose();
      }
      currentProvider = null;
      providerInitialized = false;
      providerInitializing = false;
      currentProviderType = type;

      // Initialize new provider
      ensureProvider()
        .then((provider) => {
          sendResponse({
            success: true,
            provider: type,
            providerName: provider.getProviderName(),
            model: provider.getModelName()
          });
        })
        .catch(error => {
          sendResponse({
            success: false,
            error: error.message
          });
        });
    });
    return true;
  }

  if (request.action === 'validateApiKey') {
    const { type, apiKey } = request;

    // Create a temporary provider to validate the API key
    try {
      const tempProvider = ProviderRegistry.create(type, { apiKey });
      tempProvider.validateApiKey(apiKey)
        .then(isValid => {
          sendResponse({ valid: isValid });
        })
        .catch(error => {
          sendResponse({ valid: false, error: error.message });
        });
    } catch (error) {
      sendResponse({ valid: false, error: (error as Error).message });
    }
    return true;
  }

  if (request.action === 'getAvailableProviders') {
    const providers = ProviderRegistry.getAvailableProviders();
    sendResponse({ providers });
    return false;
  }

  if (request.action === 'generateLinkedInReply') {
    console.log('🔵 Processing standard reply request');
    handleLinkedInReply(request.postContent, sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'generateLinkedInReplyWithComments') {
    console.log('🔵 Processing smart reply request');
    handleLinkedInReplyWithComments(
      request.postContent,
      request.topComments,
      sendResponse
    );
    return true; // Keep channel open for async response
  }

  if (request.action === 'checkEngineStatus') {
    performHealthCheck().then(async isHealthy => {
      const config = await getProviderConfig();
      sendResponse({
        engineReady: providerInitialized && isHealthy,
        initializing: providerInitializing,
        provider: currentProviderType,
        providerName: currentProvider?.getProviderName(),
        model: currentProvider?.getModelName(),
        healthy: isHealthy,
        requiresApiKey: config.type !== 'webllm' && !config.apiKey
      });
    });
    return true; // Keep channel open for async response
  }

  // ... [Keep all the existing prompt management handlers unchanged]
  if (request.action === 'getPrompts') {
    chrome.storage.sync.get(['customPrompts'], (result) => {
      console.log('📖 getPrompts - Storage result:', result);
      sendResponse({
        prompts: result.customPrompts || {},
        defaults: DEFAULT_PROMPTS
      });
    });
    return true;
  }

  if (request.action === 'savePrompts') {
    console.log('💾 savePrompts - Saving prompts:', request.prompts);

    // Validate the prompts structure
    if (!request.prompts || typeof request.prompts !== 'object') {
      console.error('❌ savePrompts - Invalid prompts structure:', request.prompts);
      sendResponse({ success: false, error: 'Invalid prompts structure' });
      return true;
    }

    // Ensure we have the required fields
    const validatedPrompts = {
      standard: request.prompts.standard || '',
      withComments: request.prompts.withComments || ''
    };

    console.log('✅ savePrompts - Validated prompts:', validatedPrompts);

    chrome.storage.sync.set({ customPrompts: validatedPrompts }, () => {
      if (chrome.runtime.lastError) {
        console.error('❌ savePrompts - Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }

      console.log('✅ savePrompts - Successfully saved to storage');
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'resetPrompts') {
    chrome.storage.sync.remove('customPrompts', () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'initializeModel') {
    console.log('Manual provider initialization requested');
    ensureProvider()
      .then((provider) => {
        sendResponse({
          success: true,
          message: 'Provider initialized successfully',
          provider: currentProviderType,
          providerName: provider.getProviderName(),
          model: provider.getModelName()
        });
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message,
          provider: currentProviderType
        });
      });
    return true;
  }

  if (request.action === 'popupReady') {
    console.log('Popup is ready');
    return false;
  }

  if (request.type === 'SUCCESS_REDIRECT') {
    chrome.tabs.create({ url: 'https://www.linkedin.com/' });
    return false;
  }
});

async function handleLinkedInReplyWithComments(
  postContent: string,
  topComments: Array<{text: string, likeCount: number}>,
  sendResponse: (response: any) => void
) {
  console.log('🟢 handleLinkedInReplyWithComments started');

  try {
    const provider = await ensureProvider();
    console.log('🟢 Provider ready:', provider.getProviderName());

    // ALWAYS get user's custom prompt or fall back to default
    const systemPrompt = await getUserPrompt('withComments');
    console.log('🟢 Got prompt type:', systemPrompt === DEFAULT_PROMPTS.withComments ? 'DEFAULT' : 'CUSTOM');

    // Format top comments for context with more detail
    const topCommentsContext = topComments.length > 0
      ? `\n\nTOP PERFORMING COMMENTS (study these patterns):\n${
          topComments.slice(0, 5).map((c, i) =>
            `Comment ${i + 1} (${c.likeCount} likes):\n"${c.text}"\nEngagement factor: ${
              c.likeCount > 100 ? 'Viral' :
              c.likeCount > 50 ? 'High' :
              c.likeCount > 20 ? 'Medium' : 'Standard'
            }\n`
          ).join('\n')
        }\nKEY PATTERN: Notice what makes these comments successful and apply similar strategies.`
      : '\n\nNo high-engagement comments available. Focus on adding unique value and asking thoughtful questions.';

    const userPrompt = `Generate a professional LinkedIn reply to this post:

POST CONTENT:
"${postContent}"
${topCommentsContext}

CRITICAL REQUIREMENTS:
- 1-2 impactful sentences (maximum 40 words total)
- No introductory phrases like "Great post!"
- Add genuine value or ask a thoughtful question
- Be conversational and engaging
- DO NOT include any preambles like "Here's a reply:" or explanations
- Start your response immediately with the actual content

Write your reply directly (no preambles):`;

    console.log('🟢 Starting reply generation...');

    const response = await provider.generateReply(systemPrompt, userPrompt);

    const finalReply = cleanAndLimitReply(response.reply);

    console.log('🟢 Generation complete:', finalReply);
    console.log('🟢 Word count:', finalReply.split(' ').length);

    sendResponse({
      reply: finalReply,
      basedOnComments: true,
      commentCount: topComments.length,
      provider: currentProviderType,
      model: provider.getModelName()
    });

  } catch (error) {
    console.error('🔴 ERROR in handleLinkedInReplyWithComments:', error);
    sendResponse({
      error: 'Failed to generate reply',
      fallback: true
    });
  }
}

async function handleLinkedInReply(postContent: string, sendResponse: (response: any) => void) {
  console.log('🟢 handleLinkedInReply started');

  try {
    const provider = await ensureProvider();
    console.log('🟢 Provider ready:', provider.getProviderName());

    // ALWAYS get user's custom prompt or fall back to default
    const systemPrompt = await getUserPrompt('standard');
    console.log('🟢 Got prompt type:', systemPrompt === DEFAULT_PROMPTS.standard ? 'DEFAULT' : 'CUSTOM');

    // Analyze post content for better context
    const postLength = postContent.length;
    const hasQuestion = postContent.includes('?');
    const hasData = /\d+%|\d+\s*(million|billion|thousand)|\$\d+/i.test(postContent);

    const contextHints = `
POST ANALYSIS:
- Length: ${postLength < 100 ? 'Brief' : postLength < 300 ? 'Medium' : 'Detailed'}
- Type: ${hasQuestion ? 'Question/Discussion' : hasData ? 'Data/Insights' : 'Thought/Opinion'}
- Engagement opportunity: ${hasQuestion ? 'Answer the question' : 'Add perspective'}`;

    const userPrompt = `Generate a professional LinkedIn reply to this post:

"${postContent}"
${contextHints}

CRITICAL REQUIREMENTS:
- 1-2 impactful sentences (maximum 40 words total)
- No introductory phrases like "Great post!"
- Add genuine value or ask a thoughtful question
- Be conversational and engaging
- DO NOT include any preambles like "Here's a reply:" or explanations
- Start your response immediately with the actual content

Write your reply directly (no preambles):`;

    console.log('🟢 Starting reply generation...');

    const response = await provider.generateReply(systemPrompt, userPrompt);

    const finalReply = cleanAndLimitReply(response.reply);

    console.log('🟢 Generation complete:', finalReply);
    console.log('🟢 Word count:', finalReply.split(' ').length);

    sendResponse({
      reply: finalReply,
      provider: currentProviderType,
      model: provider.getModelName()
    });

  } catch (error) {
    console.error('🔴 ERROR in handleLinkedInReply:', error);

    // Shorter fallback replies (1-2 sentences)
    const fallbackReplies = [
      "Insightful perspective! What's been your experience with this approach?",
      "This resonates strongly with what we're seeing in the field.",
      "Excellent points - particularly about the implementation challenges.",
      "Appreciate you sharing this data-driven analysis!",
      "Interesting take - how do you see this evolving in the next year?"
    ];

    const fallbackReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];

    sendResponse({
      reply: fallbackReply,
      error: 'AI provider is initializing. Using a suggested reply for now.',
      isInitializing: providerInitializing
    });
  }
}

// Helper function to clean and limit reply
function cleanAndLimitReply(reply: string): string {
  // Remove common preambles and meta-text
  const cleanReply = (text: string): string => {
    // Remove common preambles
    const preamblePatterns = [
      /^Here'?s? (?:a |the |your |my )?(?:professional |rewritten |revised |improved )?(?:LinkedIn |response|reply|version|comment).*?:\s*/i,
      /^This (?:is |would be |could be )?(?:a |the |your |my )?(?:LinkedIn |response|reply).*?:\s*/i,
      /^(?:Sure|Certainly|Absolutely)[,!]?\s*(?:here'?s?|this is).*?:\s*/i,
      /^I'?(?:ve|ll|d)? (?:rewritten|revised|created|generated|made).*?:\s*/i,
      /^(?:Response|Reply|Comment|Answer):\s*/i,
      /^Here you go:\s*/i,
      /^.*?(?:meets?|meeting|fulfill?s?) (?:the |your )?requirements?.*?:\s*/i,
    ];

    let cleaned = text.trim();
    for (const pattern of preamblePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Also remove any lines that are just meta-commentary
    const lines = cleaned.split('\n');
    const contentLines = lines.filter(line => {
      const lower = line.toLowerCase().trim();
      return !lower.startsWith('here') &&
             !lower.includes('rewritten') &&
             !lower.includes('requirements') &&
             !lower.includes('professional linkedin');
    });

    return contentLines.join(' ').trim();
  };

  const cleanedReply = cleanReply(reply);

  // Limit to 1-2 sentences for quality
  const sentences = cleanedReply.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const maxSentences = sentences.slice(0, 2).join('. ');
  const finalReply = maxSentences.trim() + (cleanedReply.endsWith('?') ? '' : '.');

  return finalReply;
}

// Keep service worker alive
chrome.alarms.create('keep-alive', { periodInMinutes: 0.25 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    // Just a keep-alive ping
    console.log('Keep-alive ping');
    // Also perform health check periodically
    if (providerInitialized) {
      performHealthCheck();
    }
  }
});

// Listen for tab updates to detect LinkedIn navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com')) {
    console.log('🔍 LinkedIn tab detected, ensuring provider is ready...');
    // Pre-initialize provider for LinkedIn tabs
    ensureProvider().catch(error => {
      console.error('Failed to pre-initialize for LinkedIn tab:', error);
    });
  }
});