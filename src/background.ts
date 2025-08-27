import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam, InitProgressReport } from "@mlc-ai/web-llm";

console.log('Background service worker loaded');

// Model configuration for optimal selection
const RECOMMENDED_MODELS = [
  "Llama-3.2-3B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC", 
  "gemma-2-2b-it-q4f16_1-MLC",
  "Phi-3.5-mini-instruct-q4f16_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
];

// Smart model selection for background service
function getOptimalBackgroundModel(): string {
  // For background service, prioritize reliability and moderate resource usage
  // Start with fastest model for quick initialization, can upgrade later
  return "Qwen2.5-0.5B-Instruct-q4f16_1-MLC"; // Fastest model for initial load
}

// Keep track of the AI engine
let engine: MLCEngineInterface | null = null;
let engineInitialized = false;
let engineInitializing = false;
let currentModel = getOptimalBackgroundModel(); // Use fast model initially

// Enhanced default prompts for better LinkedIn engagement
const DEFAULT_PROMPTS = {
  withComments: `You are a LinkedIn engagement expert who analyzes successful comments to write compelling replies.

CRITICAL: Your response must be EXACTLY 1 sentence (maximum 25 words).

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

  standard: `You are a LinkedIn communication expert who writes highly engaging, professional replies.

CRITICAL: Your response must be EXACTLY 1 sentence (maximum 25 words).

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

// Initialize engine on first use with better error handling and timeouts
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
  console.log('🚀 Initializing background AI engine with model:', currentModel);

  try {
    // Add timeout for engine creation
    const enginePromise = CreateMLCEngine(currentModel, {
      initProgressCallback: (report: InitProgressReport) => {
        console.log(`🔄 Loading ${currentModel}: ${report.text} (${Math.round(report.progress * 100)}%)`);
      }
    });

    // Timeout after 2 minutes
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Engine initialization timeout')), 120000)
    );

    engine = await Promise.race([enginePromise, timeoutPromise]);
    engineInitialized = true;
    engineInitializing = false;
    console.log('✅ Background AI engine ready!');
    return engine;
  } catch (error) {
    engineInitializing = false;
    engineInitialized = false;
    console.error('❌ Failed to initialize AI engine:', error);
    
    // Try fallback to smaller model if the current one failed
    if (currentModel !== "Qwen2.5-0.5B-Instruct-q4f16_1-MLC") {
      console.log('🔄 Trying fallback to smaller model...');
      currentModel = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
      return ensureEngine(); // Recursive retry with smaller model
    }
    
    throw error;
  }
}

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  chrome.storage.local.set({ hasUsedExtension: true });
  
  // Pre-initialize the engine after installation
  if (details.reason === 'install' || details.reason === 'update') {
    ensureEngine().catch(error => {
      console.error('Failed to pre-initialize engine:', error);
    });
  }
});

// Message handler for LinkedIn reply generation
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('🔵 STEP 4: Background received message:', request.action);
  
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
    sendResponse({ 
      initialized: engineInitialized,
      initializing: engineInitializing 
    });
    return false;
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
  
  try {
    console.log('🟢 STEP 5A: Ensuring engine...');
    const engine = await ensureEngine();
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
- EXACTLY 1 sentence only (maximum 25 words)
- No introductory phrases like "Great post!" 
- Add genuine value or ask a thoughtful question
- Be conversational and engaging

Your reply (1 sentence only):`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log('🟢 STEP 5F: Starting AI generation...');
    
    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: 40, // Drastically reduced for 1 sentence only
      temperature: 0.7,
      top_p: 0.9,
      stop: ["\n", ".", "!", "?"] // Stop at first sentence ending
    });

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        reply += delta;
      }
    }

    const cleanedReply = reply.trim();
    
    // Ensure it's really just one sentence
    const sentences = cleanedReply.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const finalReply = sentences[0].trim() + (cleanedReply.includes('?') ? '?' : '.');
    
    console.log('🟢 STEP 5G: Generation complete:', finalReply);
    console.log('🟢 Word count:', finalReply.split(' ').length);
    
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
  
  try {
    console.log('🟢 STEP 5A: Ensuring engine...');
    const engine = await ensureEngine();
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
- EXACTLY 1 sentence only (maximum 25 words)
- No introductory phrases like "Great post!" 
- Add genuine value or ask a thoughtful question
- Be conversational and engaging

Your reply (1 sentence only):`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    console.log('🟢 STEP 5F: Starting AI generation...');

    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: 40, // Drastically reduced for 1 sentence only
      temperature: 0.7,
      top_p: 0.9,
      stop: ["\n", ".", "!", "?"] // Stop at first sentence ending
    });

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        reply += delta;
      }
    }

    const cleanedReply = reply.trim();
    
    // Ensure it's really just one sentence
    const sentences = cleanedReply.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const finalReply = sentences[0].trim() + (cleanedReply.includes('?') ? '?' : '.');
    
    console.log('🟢 STEP 5G: Generation complete:', finalReply);
    console.log('🟢 Word count:', finalReply.split(' ').length);
    
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
  }
});
