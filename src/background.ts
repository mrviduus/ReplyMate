import { CreateMLCEngine, MLCEngineInterface, ChatCompletionMessageParam, InitProgressReport } from "@mlc-ai/web-llm";

console.log('Background service worker loaded');

// Keep track of the AI engine
let engine: MLCEngineInterface | null = null;
let engineInitialized = false;
let engineInitializing = false;
let currentModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

// Default prompts that users can customize
const DEFAULT_PROMPTS = {
  withComments: `You are a professional LinkedIn user who writes thoughtful, engaging replies.
You have analyzed the most successful comments on this post (those with the most likes).

ANALYSIS GUIDELINES:
- Study the tone and style of highly-liked comments
- Identify what makes them successful (humor, insights, questions, personal stories)
- Note the length and structure patterns

YOUR REPLY SHOULD:
- Be exactly 1-2 sentences maximum
- Incorporate successful elements from top comments without copying
- Add unique value while following proven engagement patterns
- Be authentic and conversational, not generic
- Include either a relevant question OR actionable insight
- Match the energy level (formal vs casual) of successful comments
- Avoid clichés like "Great post!" or "Thanks for sharing!"

ENGAGEMENT TACTICS:
- If top comments ask questions, your reply should too
- If top comments share experiences, relate briefly
- If top comments use data/facts, include a relevant statistic`,

  standard: `You are a professional LinkedIn user who writes thoughtful, engaging replies.

CONTEXT AWARENESS:
- Identify the post's main topic and industry
- Recognize the poster's expertise level
- Understand the discussion's tone

REPLY GUIDELINES:
- Write exactly 1-2 sentences maximum
- Be professional yet conversational and warm
- Add genuine value through insights, questions, or experiences
- Reference a specific point from the post
- Show authentic interest with specific observations
- Use emojis sparingly (max 1) and only if appropriate
- Include either a thoughtful question OR share a brief insight

AVOID:
- "Great post!" or "Thanks for sharing!" as openers
- Overly formal language
- Self-promotion or unrelated topics
- Generic agreement without substance`
};

// Get user's custom prompt or use default
async function getUserPrompt(type: 'withComments' | 'standard'): Promise<string> {
  const result = await chrome.storage.sync.get(['customPrompts']);
  const customPrompts = result.customPrompts || {};
  return customPrompts[type] || DEFAULT_PROMPTS[type];
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
  if (request.action === 'generateLinkedInReply') {
    handleLinkedInReply(request.postContent, sendResponse);
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'generateLinkedInReplyWithComments') {
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
      sendResponse({
        prompts: result.customPrompts || {},
        defaults: DEFAULT_PROMPTS
      });
    });
    return true;
  }
  
  if (request.action === 'savePrompts') {
    chrome.storage.sync.set({ customPrompts: request.prompts }, () => {
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
  try {
    const engine = await ensureEngine();
    
    console.log('Generating LinkedIn reply based on top comments...');
    
    // Get user's custom prompt or default
    const systemPrompt = await getUserPrompt('withComments');

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

TASK: Create a reply that would likely receive high engagement by learning from successful patterns above.
Remember: Maximum 1-2 sentences. Be specific, add value, and encourage further discussion.

Your reply:`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: 100, // Reduced for 1-2 sentences
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
    console.log('Generated smart reply based on comment patterns:', cleanedReply);
    
    sendResponse({ 
      reply: cleanedReply,
      basedOnComments: true,
      commentCount: topComments.length
    });
    
  } catch (error) {
    console.error('Error generating smart reply:', error);
    sendResponse({ 
      error: 'Failed to generate reply',
      fallback: true 
    });
  }
}

async function handleLinkedInReply(postContent: string, sendResponse: (response: any) => void) {
  try {
    const engine = await ensureEngine();
    
    console.log('Generating LinkedIn reply for:', postContent.substring(0, 100) + '...');
    
    // Get user's custom prompt or default
    const systemPrompt = await getUserPrompt('standard');

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

Create an engaging, value-adding reply (1-2 sentences maximum):`;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    let reply = "";
    const completion = await engine.chat.completions.create({
      stream: true,
      messages: messages,
      max_tokens: 100, // Reduced for 1-2 sentences
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
