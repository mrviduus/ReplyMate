import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam, InitProgressReport } from "@mlc-ai/web-llm";

console.log('Background service worker loaded');

// Keep track of the AI engine
let engine: MLCEngineInterface | null = null;
let engineInitialized = false;
let engineInitializing = false;
let currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

// Default prompts that users can customize
const DEFAULT_PROMPTS = {
  withComments: `You are a professional LinkedIn user who writes SHORT, engaging replies.

CRITICAL: Your response must be EXACTLY 1 sentence (maximum 25 words).

ANALYSIS GUIDELINES:
- Study the tone and style of highly-liked comments
- Identify what makes them successful (humor, insights, questions, personal stories)

YOUR REPLY MUST:
- Be exactly 1 sentence (maximum 25 words)
- Add unique value or ask a thoughtful question
- Be authentic and conversational
- Avoid clichés like "Great post!" or "Thanks for sharing!"

ENGAGEMENT TACTICS:
- If top comments ask questions, your reply should too
- If top comments share experiences, relate briefly
- Use insights or data if relevant`,

  standard: `You are a professional LinkedIn user who writes SHORT, engaging replies.

CRITICAL: Your response must be EXACTLY 1 sentence (maximum 25 words).

REPLY GUIDELINES:
- Write exactly 1 sentence (maximum 25 words)
- Be professional yet conversational and warm
- Add genuine value through insights, questions, or experiences
- Reference a specific point from the post
- Include either a thoughtful question OR share a brief insight

AVOID:
- "Great post!" or "Thanks for sharing!" as openers
- Multiple sentences or long explanations
- Generic agreement without substance`
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

// Initialize engine on first use
async function ensureEngine(): Promise<MLCEngineInterface> {
  if (engineInitialized && engine) {
    return engine;
  }

  if (engineInitializing) {
    // Wait for ongoing initialization
    while (engineInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return engine!;
  }

  engineInitializing = true;
  
  try {
    console.log('Initializing AI engine in background...');
    
    const initProgressCallback = (report: InitProgressReport) => {
      console.log(`AI Engine: ${report.text} - ${Math.round(report.progress * 100)}%`);
    };

    engine = await CreateMLCEngine(currentModel, {
      initProgressCallback: initProgressCallback,
    });
    
    engineInitialized = true;
    console.log('AI engine initialized successfully');
    
    // Store initialization state
    chrome.storage.local.set({ engineInitialized: true });
    
    return engine;
  } catch (error) {
    console.error('Failed to initialize AI engine:', error);
    throw error;
  } finally {
    engineInitializing = false;
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
