import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam, InitProgressReport } from "@mlc-ai/web-llm";

console.log('Background service worker loaded');

// Keep track of the AI engine
let engine: MLCEngineInterface | null = null;
let engineInitialized = false;
let engineInitializing = false;
let currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

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
  if (request.action === 'generateLinkedInReply') {
    handleLinkedInReply(request.postContent, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'checkEngineStatus') {
    sendResponse({ 
      initialized: engineInitialized,
      initializing: engineInitializing 
    });
    return false;
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

async function handleLinkedInReply(postContent: string, sendResponse: (response: any) => void) {
  try {
    // Check if we can initialize the engine
    const engine = await ensureEngine();
    
    console.log('Generating LinkedIn reply for:', postContent.substring(0, 100) + '...');
    
    // Create LinkedIn-specific prompt
    const systemPrompt = `You are a professional LinkedIn user who writes thoughtful, engaging replies. 
Your responses should:
- Be professional yet conversational
- Add value to the discussion
- Be concise (2-3 sentences)
- Show genuine interest or insight
- Avoid excessive hashtags or emojis
- Be authentic and helpful`;

    const userPrompt = `Generate a professional LinkedIn reply to this post:

"${postContent}"

Reply:`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
      top_p: 0.9
    });

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        reply += delta;
      }
    }

    const cleanedReply = reply.trim();
    console.log('Generated LinkedIn reply:', cleanedReply);
    
    sendResponse({ reply: cleanedReply });
    
  } catch (error) {
    console.error('Error generating reply:', error);
    
    // Provide helpful fallback
    const fallbackReplies = [
      "Thank you for sharing this insightful post! I'd love to hear more about your perspective on this topic.",
      "Great insights! This really resonates with my experience in the field.",
      "Interesting perspective! I appreciate you sharing your expertise on this subject.",
      "Thanks for the valuable insights! This gives me a lot to think about.",
      "Excellent post! Your analysis really highlights some important points."
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
