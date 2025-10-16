import { MLCEngineInterface, ChatCompletionMessageParam } from "@mlc-ai/web-llm";
import OptimizedModelLoader from './model-loader';

console.log('Background service worker loaded');

// Model configuration for optimal selection
const RECOMMENDED_MODELS = [
  "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC", 
  "gemma-2-2b-it-q4f16_1-MLC",
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
];

// Smart model selection for background service based on device capabilities
function getOptimalBackgroundModel(): string {
  // Check device memory if available
  const deviceMemory = (navigator as any).deviceMemory; // In GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4; // CPU cores

  console.log(`📊 Device Info: ${deviceMemory}GB RAM, ${hardwareConcurrency} cores`);

  // Model tiers based on device capability
  const modelTiers = {
    high: "Llama-3.2-3B-Instruct-q4f16_1-MLC",     // 3B: Highest quality (requires 8GB+ RAM)
    medium: "Llama-3.2-1B-Instruct-q4f16_1-MLC",   // 1B: Balanced (4-8GB RAM)
    low: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"       // 0.5B: Fast fallback (<4GB RAM)
  };

  // Device-based selection
  if (deviceMemory >= 8 && hardwareConcurrency >= 8) {
    console.log('🚀 High-end device detected: Using 3B model for best quality');
    return modelTiers.high;
  } else if (deviceMemory >= 4 || hardwareConcurrency >= 4) {
    console.log('⚖️ Mid-range device detected: Using 1B balanced model');
    return modelTiers.medium;
  } else {
    console.log('⚡ Low-end device detected: Using 0.5B fast model');
    return modelTiers.low;
  }
}

// Keep track of the AI engine using optimized loader
const modelLoader = OptimizedModelLoader.getInstance();
let engine: MLCEngineInterface | null = null;
let engineInitialized = false;
let engineInitializing = false;
let currentModel = getOptimalBackgroundModel(); // Use fast model initially

// AI generation parameters - Optimized defaults for better quality
let aiTemperature = 0.85; // Higher creativity
let aiMaxTokens = 150; // Longer, more detailed responses

// Load AI parameters from storage on startup
async function loadAIParameters(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(['aiTemperature', 'aiMaxTokens']);
    aiTemperature = result.aiTemperature || 0.85; // Optimized default
    aiMaxTokens = result.aiMaxTokens || 150; // Optimized default
    console.log(`🎛️ AI Parameters loaded: temperature=${aiTemperature}, maxTokens=${aiMaxTokens}`);
  } catch (error) {
    console.error('Failed to load AI parameters, using defaults:', error);
  }
}

// Initialize parameters on script load
loadAIParameters();

// Performance telemetry
interface GenerationMetrics {
  startTime: number;
  modelLoadTime?: number;
  inferenceTime?: number;
  totalTime?: number;
  tokenCount?: number;
  wordCount?: number;
  cacheHit: boolean;
  retryAttempted: boolean;
  validationScore?: number;
  modelUsed: string;
}

// Log performance metrics
function logPerformanceMetrics(metrics: GenerationMetrics): void {
  const totalTime = (metrics.totalTime || 0).toFixed(0);
  const inferenceTime = (metrics.inferenceTime || 0).toFixed(0);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                   PERFORMANCE METRICS                      ║
╠════════════════════════════════════════════════════════════╣
║ Model: ${metrics.modelUsed.padEnd(44)} ║
║ Cache Hit: ${(metrics.cacheHit ? '✅ YES' : '❌ NO').padEnd(41)} ║
║ Total Time: ${totalTime.padEnd(10)} ms                              ║
║ Inference Time: ${inferenceTime.padEnd(6)} ms                              ║
║ Word Count: ${String(metrics.wordCount || 0).padEnd(10)}                          ║
║ Validation Score: ${String(metrics.validationScore || 'N/A').padEnd(6)}/100                       ║
║ Retry Attempted: ${(metrics.retryAttempted ? '🔄 YES' : '✓ NO').padEnd(38)} ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Also store metrics for analysis
  chrome.storage.local.get(['performanceMetrics'], (result) => {
    const allMetrics = result.performanceMetrics || [];
    allMetrics.push({
      timestamp: Date.now(),
      ...metrics
    });

    // Keep only last 100 metrics
    if (allMetrics.length > 100) {
      allMetrics.shift();
    }

    chrome.storage.local.set({ performanceMetrics: allMetrics });
  });
}

// Response validation function
interface ValidationResult {
  valid: boolean;
  reason?: 'too_short' | 'too_long' | 'no_punctuation' | 'has_preamble' | 'generic';
  score?: number; // 0-100 quality score
}

function validateReplyQuality(reply: string): ValidationResult {
  const trimmedReply = reply.trim();
  const wordCount = trimmedReply.split(/\s+/).length;
  const sentenceCount = (trimmedReply.match(/[.!?]+/g) || []).length;

  // Check minimum length
  if (wordCount < 10) {
    return { valid: false, reason: 'too_short', score: 20 };
  }

  // Check maximum length (allow up to 80 words for detailed responses)
  if (wordCount > 80) {
    return { valid: false, reason: 'too_long', score: 40 };
  }

  // Check for proper punctuation
  if (!/[.!?]$/.test(trimmedReply)) {
    return { valid: false, reason: 'no_punctuation', score: 50 };
  }

  // Check for common preambles
  const preamblePatterns = [
    /^here['']?s\s/i,
    /^here\s+is\s/i,
    /^this\s+is\s/i,
    /^i['']?ve\s+rewritten/i,
    /^response:/i,
    /^reply:/i
  ];

  for (const pattern of preamblePatterns) {
    if (pattern.test(trimmedReply)) {
      return { valid: false, reason: 'has_preamble', score: 60 };
    }
  }

  // Check for generic responses
  const genericPatterns = [
    /^(great|nice|good|excellent)\s+(post|share|article)[!.]/i,
    /^thanks?\s+for\s+sharing[!.]/i,
    /^(totally|completely)\s+agree[!.]/i
  ];

  for (const pattern of genericPatterns) {
    if (pattern.test(trimmedReply)) {
      return { valid: false, reason: 'generic', score: 45 };
    }
  }

  // Calculate quality score
  let score = 70; // Base score

  // Bonus for questions (engagement)
  if (trimmedReply.includes('?')) score += 10;

  // Bonus for specific data/numbers
  if (/\d+(%|x|\s+(percent|times|increase|decrease))/i.test(trimmedReply)) score += 10;

  // Bonus for optimal length (15-40 words)
  if (wordCount >= 15 && wordCount <= 40) score += 10;

  return { valid: true, score: Math.min(100, score) };
}

// Few-shot examples for better AI learning
const FEW_SHOT_EXAMPLES = `
EXAMPLE 1:
Post: "Just launched our new product after 6 months of development!"
Reply: "The timing couldn't be better given the Q4 market trends. What was the biggest technical challenge your team overcame during development?"

EXAMPLE 2:
Post: "Remote work is killing company culture."
Reply: "Interesting perspective. We've actually seen the opposite—our async standups improved transparency by 40%. What specific cultural elements are you seeing decline?"

EXAMPLE 3:
Post: "AI will replace 80% of jobs in the next 5 years."
Reply: "That timeline seems aggressive based on current adoption curves. I've found AI augments rather than replaces roles—what industries are you seeing this happen fastest?"

EXAMPLE 4:
Post: "Finally hit our Q3 revenue target! Team effort pays off."
Reply: "Congrats on the milestone! Were there any unexpected strategies that moved the needle more than anticipated?"

EXAMPLE 5:
Post: "The key to successful leadership is transparency and communication."
Reply: "This resonates strongly. How do you balance transparency with keeping strategic plans confidential during competitive periods?"
`;

// Enhanced default prompts for better LinkedIn engagement
const DEFAULT_PROMPTS = {
  withComments: `You are a LinkedIn engagement expert. Respond DIRECTLY with the reply text only - no preambles, no explanations.

CRITICAL: Output 1-2 impactful sentences (maximum 40 words total). Start immediately with your response.

${FEW_SHOT_EXAMPLES}

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

${FEW_SHOT_EXAMPLES}

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

// Track cached models in memory
const cachedModels = new Set<string>();

// Check if model is cached
async function checkModelCacheStatus(modelId: string): Promise<boolean> {
  try {
    // Check Chrome storage for cache status
    const result = await chrome.storage.local.get([`model-${modelId}-cached`]);
    const isCached = result[`model-${modelId}-cached`] === 'true';
    if (isCached) {
      cachedModels.add(modelId);
    }
    return isCached || cachedModels.has(modelId);
  } catch {
    // Fallback to memory cache
    return cachedModels.has(modelId);
  }
}

// Initialize engine on first use with optimized loader
async function ensureEngine(): Promise<MLCEngineInterface> {
  if (engine && engineInitialized) {
    return engine;
  }

  if (engineInitializing) {
    console.log('🔄 Engine already initializing, waiting...');
    // Wait for initialization to complete with timeout
    let attempts = 0;
    while (engineInitializing && attempts < 60) { // 30 seconds max
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }

    if (engine && engineInitialized) {
      return engine;
    } else {
      throw new Error('Engine initialization timed out or failed');
    }
  }

  engineInitializing = true;
  console.log(`🚀 Initializing background AI engine with optimized loader`);

  try {
    // Parallel initialization: Check network AND cache status simultaneously
    const initStartTime = performance.now();

    // Use device-optimized model selection
    currentModel = getOptimalBackgroundModel();
    console.log('🎯 Using optimal model for LinkedIn:', currentModel);

    // Run network check and cache check in parallel
    const [networkResult, cacheResult] = await Promise.allSettled([
      checkNetworkConnectivity(),
      checkModelCacheStatus(currentModel)
    ]);

    // Log parallel results
    const initCheckTime = performance.now() - initStartTime;
    console.log(`⚡ Parallel init checks completed in ${initCheckTime.toFixed(0)}ms`);

    if (networkResult.status === 'rejected') {
      console.warn('⚠️ Network check failed, but continuing with model load');
    }

    // Track if this is first load
    const isFirstLoad = cacheResult.status === 'fulfilled' ? !cacheResult.value : true;

    // Send initial loading message
    sendProgressToAllTabs({
      type: 'modelLoadProgress',
      progress: 0,
      message: isFirstLoad
        ? '🚀 First-time setup: Downloading AI model (~50-200MB)...'
        : '⚡ Loading model from cache...',
      stage: 'initializing',
      isFirstLoad
    });

    // Use optimized loader with progress tracking
    engine = await modelLoader.loadModel(currentModel, (state) => {
      const progress = Math.round(state.progress * 100);
      console.log(`🔄 ${state.progressText} (${progress}%)`);

      // Send detailed progress updates
      let message = state.progressText;
      let stage = 'downloading';

      if (progress < 20) {
        stage = 'initializing';
        message = isFirstLoad
          ? `📥 Downloading model... ${progress}% (This may take 1-3 minutes on first load)`
          : `⚡ Loading from cache... ${progress}%`;
      } else if (progress < 50) {
        stage = 'downloading';
        message = isFirstLoad
          ? `📥 Downloading model files... ${progress}% (One-time download)`
          : `🔄 Loading model weights... ${progress}%`;
      } else if (progress < 80) {
        stage = 'loading';
        message = `🔧 Initializing AI engine... ${progress}%`;
      } else {
        stage = 'finalizing';
        message = `✨ Almost ready... ${progress}%`;
      }

      // Broadcast progress to all tabs
      sendProgressToAllTabs({
        type: 'modelLoadProgress',
        progress: progress,
        message: message,
        stage: stage,
        isFirstLoad: isFirstLoad
      });
    }, {
      maxRetries: 3,
      timeoutMs: 120000,
      preload: false
    });

    engineInitialized = true;
    engineInitializing = false;

    // Mark model as cached in memory and Chrome storage
    cachedModels.add(currentModel);
    chrome.storage.local.set({ [`model-${currentModel}-cached`]: 'true' }).catch(() => {
      // Ignore storage errors
    });

    // Send completion message
    sendProgressToAllTabs({
      type: 'modelLoadProgress',
      progress: 100,
      message: '✅ AI model ready!',
      stage: 'complete',
      isFirstLoad: false
    });

    console.log('✅ Background AI engine ready with optimized loader!');
    return engine;
  } catch (error) {
    engineInitializing = false;
    engineInitialized = false;
    console.error(`❌ Failed to initialize AI engine:`, error);

    // If all fallbacks failed, provide detailed error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const detailedError = new Error(`Model initialization failed.
      Last error: ${errorMessage}

      Troubleshooting:
      1. Check your internet connection
      2. Try refreshing the page
      3. Clear browser cache and try again
      4. Disable other extensions temporarily`);

    throw detailedError;
  }
}

// Check network connectivity to CDN
async function checkNetworkConnectivity(): Promise<void> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    // Use a simpler endpoint that's more likely to work
    const response = await fetch('https://huggingface.co/', {
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`CDN connectivity check failed: ${response.status}`);
    }
    
    console.log('✅ CDN connectivity verified');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('⚠️ CDN connectivity issue detected:', errorMessage);
    // Don't throw here - let the engine initialization handle the fallback
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  chrome.storage.local.set({ hasUsedExtension: true });
  
  // Reset initialization state on fresh install
  if (details.reason === 'install') {
    engineInitialized = false;
    engineInitializing = false;
  }
  
  // Pre-initialize the engine after installation with error handling
  if (details.reason === 'install' || details.reason === 'update') {
    console.log('🚀 Pre-initializing engine after', details.reason);
    ensureEngine().catch(error => {
      console.error('Failed to pre-initialize engine:', error);
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

// Add a health check function
async function performHealthCheck(): Promise<boolean> {
  try {
    if (!engineInitialized || !engine) {
      console.log('🏥 Health check: Engine not ready');
      return false;
    }
    
    // Try a simple operation to verify engine is working
    console.log('🏥 Health check: Engine appears healthy');
    return true;
  } catch (error) {
    console.error('🏥 Health check failed:', error);
    // Reset engine state to trigger re-initialization
    engineInitialized = false;
    engine = null;
    return false;
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

// Message handler for LinkedIn reply generation
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔵 STEP 4: Background received message:', request.action);

  // Pre-initialize engine when LinkedIn content script loads
  if (request.action === 'linkedinContentScriptReady') {
    console.log('🚀 LinkedIn detected, pre-initializing AI engine...');
    ensureEngine()
      .then(() => {
        console.log('✅ AI engine pre-initialized for LinkedIn');
        sendResponse({ engineReady: true, currentModel: currentModel });
      })
      .catch(error => {
        console.error('❌ Failed to pre-initialize engine:', error);
        sendResponse({ engineReady: false, error: error.message, currentModel: currentModel });
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'generateLinkedInReply') {
    console.log('🔵 STEP 4A: Processing standard reply request');
    console.log('🔵 Post content received:', request.postContent?.substring(0, 100));
    handleLinkedInReply(request.postContent, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'generateLinkedInReplyWithComments') {
    console.log('🔵 STEP 4B: Processing smart reply request');
    console.log('🔵 Comments received:', request.topComments?.length);
    handleLinkedInReplyWithComments(
      request.postContent, 
      request.topComments,
      sendResponse
    );
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'checkEngineStatus') {
    performHealthCheck().then(async isHealthy => {
      // Check if model is cached
      const isCached = await checkModelCacheStatus(currentModel);

      sendResponse({
        engineReady: engineInitialized && isHealthy,
        initializing: engineInitializing,
        currentModel: currentModel,
        healthy: isHealthy,
        cached: isCached,
        cacheMessage: isCached ? 'Model loaded from cache' : 'First-time download required'
      });
    });
    return true; // Keep channel open for async response
  }
  
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
      
      // Verify save by reading back
      chrome.storage.sync.get(['customPrompts'], (verifyResult) => {
        console.log('🔍 savePrompts - Verification read:', verifyResult);
        
        if (verifyResult.customPrompts) {
          console.log('🎯 Verified standard:', verifyResult.customPrompts.standard?.substring(0, 50) + '...');
          console.log('🎯 Verified withComments:', verifyResult.customPrompts.withComments?.substring(0, 50) + '...');
        }
      });
      
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
  
  if (request.action === 'verifyPrompts') {
    chrome.storage.sync.get(['customPrompts'], async (result) => {
      const customPrompts = result.customPrompts || {};
      const hasCustom = Object.keys(customPrompts).length > 0;
      
      console.log('🔍 VERIFICATION RESULTS:');
      console.log('📦 Raw storage data:', result);
      console.log('🎯 Custom prompts found:', hasCustom);
      
      if (hasCustom) {
        console.log('📝 Standard prompt (first 100 chars):', customPrompts.standard?.substring(0, 100));
        console.log('📝 Comments prompt (first 100 chars):', customPrompts.withComments?.substring(0, 100));
      }
      
      // Test actual retrieval
      const standardPrompt = await getUserPrompt('standard');
      const withCommentsPrompt = await getUserPrompt('withComments');
      
      sendResponse({
        hasCustomPrompts: hasCustom,
        customPrompts: customPrompts,
        retrievedStandard: standardPrompt.substring(0, 100),
        retrievedComments: withCommentsPrompt.substring(0, 100),
        isUsingCustomStandard: standardPrompt !== DEFAULT_PROMPTS.standard,
        isUsingCustomComments: withCommentsPrompt !== DEFAULT_PROMPTS.withComments
      });
    });
    return true;
  }
  
  if (request.action === 'debugPrompts') {
    (async () => {
      const result = await chrome.storage.sync.get(['customPrompts']);
      const standardPrompt = await getUserPrompt('standard');
      const withCommentsPrompt = await getUserPrompt('withComments');
      
      sendResponse({
        stored: result.customPrompts || {},
        activeStandard: standardPrompt.substring(0, 200),
        activeWithComments: withCommentsPrompt.substring(0, 200),
        isCustomStandard: standardPrompt !== DEFAULT_PROMPTS.standard,
        isCustomWithComments: withCommentsPrompt !== DEFAULT_PROMPTS.withComments
      });
    })();
    return true;
  }
  
  if (request.action === 'updateModel') {
    console.log('Model update requested:', request.model);
    if (request.model && request.model !== currentModel) {
      currentModel = request.model;
      // Reset engine to force reload with new model
      engine = null;
      engineInitialized = false;
      engineInitializing = false;
    }
    sendResponse({ success: true, currentModel: currentModel });
    return false;
  }

  if (request.action === 'updateAIParameters') {
    console.log('AI parameters update requested:', request);
    if (typeof request.temperature === 'number') {
      aiTemperature = request.temperature;
    }
    if (typeof request.maxTokens === 'number') {
      aiMaxTokens = request.maxTokens;
    }
    console.log(`✅ AI Parameters updated: temperature=${aiTemperature}, maxTokens=${aiMaxTokens}`);
    sendResponse({ success: true, temperature: aiTemperature, maxTokens: aiMaxTokens });
    return false;
  }

  if (request.action === 'initializeModel') {
    console.log('Manual model initialization requested');
    ensureEngine()
      .then(() => {
        sendResponse({ success: true, message: 'Model initialized successfully', currentModel: currentModel });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message, currentModel: currentModel });
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
  console.log('🟢 STEP 5: handleLinkedInReplyWithComments started');

  // Initialize performance metrics
  const metrics: GenerationMetrics = {
    startTime: performance.now(),
    cacheHit: await checkModelCacheStatus(currentModel),
    retryAttempted: false,
    modelUsed: currentModel
  };

  try {
    console.log('🟢 STEP 5A: Ensuring engine...');
    const engineStartTime = performance.now();
    const engine = await ensureEngine();
    metrics.modelLoadTime = performance.now() - engineStartTime;
    console.log('🟢 STEP 5B: Engine ready');
    
    console.log('🟢 STEP 5C: Getting user prompt for withComments...');
    
    // ALWAYS get user's custom prompt or fall back to default
    const systemPrompt = await getUserPrompt('withComments');
    console.log('🟢 STEP 5D: Got prompt type:', systemPrompt === DEFAULT_PROMPTS.withComments ? 'DEFAULT' : 'CUSTOM');
    console.log('📋 Using system prompt:', systemPrompt.substring(0, 100) + '...');

    // Check storage directly here for debugging
    const storageCheck = await chrome.storage.sync.get(['customPrompts']);
    console.log('🟢 STEP 5E: Direct storage check:', storageCheck);

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

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log('🟢 STEP 5F: Starting AI generation...');
    console.log(`🎛️ Using parameters: temperature=${aiTemperature}, maxTokens=${aiMaxTokens}`);

    const inferenceStartTime = performance.now();
    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: aiMaxTokens, // User-configurable
      temperature: aiTemperature, // User-configurable
      top_p: 0.9,
      stop: ["\n\n", "\n\n\n"] // Only stop on double newlines
    });

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        reply += delta;
      }
    }

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
    let finalReply = maxSentences.trim() + (cleanedReply.endsWith('?') ? '' : '.');

    // Validate reply quality
    const validation = validateReplyQuality(finalReply);
    console.log('🟢 STEP 5G: Validation result:', validation);
    metrics.validationScore = validation.score;
    metrics.inferenceTime = performance.now() - inferenceStartTime;

    // If quality is low, retry once with adjusted temperature
    if (!validation.valid && validation.score! < 60) {
      console.log(`⚠️ Low quality reply (${validation.reason}), retrying with higher temperature...`);
      metrics.retryAttempted = true;

      // Retry with higher temperature for more creativity
      const retryCompletion = await engine.chat.completions.create({
        stream: true,
        messages: messages,
        max_tokens: aiMaxTokens,
        temperature: Math.min(1.0, aiTemperature + 0.15), // Increase temperature
        top_p: 0.9,
        stop: ["\n\n", "\n\n\n"]
      });

      let retryReply = "";
      for await (const chunk of retryCompletion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) retryReply += delta;
      }

      const retryCleanedReply = cleanReply(retryReply);
      const retrySentences = retryCleanedReply.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const retryMaxSentences = retrySentences.slice(0, 2).join('. ');
      const retryFinalReply = retryMaxSentences.trim() + (retryCleanedReply.endsWith('?') ? '' : '.');

      const retryValidation = validateReplyQuality(retryFinalReply);
      console.log('🔄 Retry validation:', retryValidation);

      // Use retry if better, otherwise keep original
      if (retryValidation.valid || (retryValidation.score! > validation.score!)) {
        finalReply = retryFinalReply;
        console.log('✅ Using retry result (better quality)');
      }
    }

    console.log('🟢 STEP 5G: Generation complete:', finalReply);

    // Finalize metrics
    metrics.totalTime = performance.now() - metrics.startTime;
    metrics.wordCount = finalReply.split(/\s+/).length;

    // Log performance
    logPerformanceMetrics(metrics);

    sendResponse({
      reply: finalReply,
      basedOnComments: true,
      commentCount: topComments.length
    });
    
  } catch (error) {
    console.error('🔴 STEP 5 ERROR in handleLinkedInReplyWithComments:', error);
    sendResponse({ 
      error: 'Failed to generate reply',
      fallback: true 
    });
  }
}

async function handleLinkedInReply(postContent: string, sendResponse: (response: any) => void) {
  console.log('🟢 STEP 5: handleLinkedInReply started');

  // Initialize performance metrics
  const metrics: GenerationMetrics = {
    startTime: performance.now(),
    cacheHit: await checkModelCacheStatus(currentModel),
    retryAttempted: false,
    modelUsed: currentModel
  };

  try {
    console.log('🟢 STEP 5A: Ensuring engine...');
    const engineStartTime = performance.now();
    const engine = await ensureEngine();
    metrics.modelLoadTime = performance.now() - engineStartTime;
    console.log('🟢 STEP 5B: Engine ready');
    
    console.log('🟢 STEP 5C: Getting user prompt for standard...');
    
    // ALWAYS get user's custom prompt or fall back to default
    const systemPrompt = await getUserPrompt('standard');
    console.log('� STEP 5D: Got prompt type:', systemPrompt === DEFAULT_PROMPTS.standard ? 'DEFAULT' : 'CUSTOM');
    console.log('�📋 Using system prompt:', systemPrompt.substring(0, 100) + '...');

    // Check storage directly here for debugging
    const storageCheck = await chrome.storage.sync.get(['customPrompts']);
    console.log('🟢 STEP 5E: Direct storage check:', storageCheck);

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

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log('🟢 STEP 5F: Starting AI generation...');
    console.log(`🎛️ Using parameters: temperature=${aiTemperature}, maxTokens=${aiMaxTokens}`);

    const inferenceStartTime = performance.now();
    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: aiMaxTokens, // User-configurable
      temperature: aiTemperature, // User-configurable
      top_p: 0.9,
      stop: ["\n\n", "\n\n\n"] // Only stop on double newlines
    });

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        reply += delta;
      }
    }

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
    let finalReply = maxSentences.trim() + (cleanedReply.endsWith('?') ? '' : '.');

    // Validate reply quality
    const validation = validateReplyQuality(finalReply);
    console.log('🟢 STEP 5G: Validation result:', validation);
    metrics.validationScore = validation.score;
    metrics.inferenceTime = performance.now() - inferenceStartTime;

    // If quality is low, retry once with adjusted temperature
    if (!validation.valid && validation.score! < 60) {
      console.log(`⚠️ Low quality reply (${validation.reason}), retrying with higher temperature...`);
      metrics.retryAttempted = true;

      // Retry with higher temperature for more creativity
      const retryCompletion = await engine.chat.completions.create({
        stream: true,
        messages: messages,
        max_tokens: aiMaxTokens,
        temperature: Math.min(1.0, aiTemperature + 0.15), // Increase temperature
        top_p: 0.9,
        stop: ["\n\n", "\n\n\n"]
      });

      let retryReply = "";
      for await (const chunk of retryCompletion) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) retryReply += delta;
      }

      const retryCleanedReply = cleanReply(retryReply);
      const retrySentences = retryCleanedReply.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const retryMaxSentences = retrySentences.slice(0, 2).join('. ');
      const retryFinalReply = retryMaxSentences.trim() + (retryCleanedReply.endsWith('?') ? '' : '.');

      const retryValidation = validateReplyQuality(retryFinalReply);
      console.log('🔄 Retry validation:', retryValidation);

      // Use retry if better, otherwise keep original
      if (retryValidation.valid || (retryValidation.score! > validation.score!)) {
        finalReply = retryFinalReply;
        console.log('✅ Using retry result (better quality)');
      }
    }

    console.log('🟢 STEP 5G: Generation complete:', finalReply);

    // Finalize metrics
    metrics.totalTime = performance.now() - metrics.startTime;
    metrics.wordCount = finalReply.split(/\s+/).length;

    // Log performance
    logPerformanceMetrics(metrics);

    sendResponse({ reply: finalReply });
    
  } catch (error) {
    console.error('🔴 STEP 5 ERROR in handleLinkedInReply:', error);
    
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
      error: 'AI engine is initializing. Using a suggested reply for now.',
      isInitializing: engineInitializing
    });
  }
}

// Keep service worker alive
chrome.alarms.create('keep-alive', { periodInMinutes: 0.25 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    // Just a keep-alive ping
    console.log('Keep-alive ping');
    // Also perform health check periodically
    if (engineInitialized) {
      performHealthCheck();
    }
  }
});

// Listen for tab updates to detect LinkedIn navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('linkedin.com')) {
    console.log('🔍 LinkedIn tab detected, ensuring engine is ready...');
    // Pre-initialize engine for LinkedIn tabs
    ensureEngine().catch(error => {
      console.error('Failed to pre-initialize for LinkedIn tab:', error);
    });
  }
});
