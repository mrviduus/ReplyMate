/**
 * Service Worker for ReplyMate Extension
 * Handles background AI comment generation using WebLLM
 */

import {
  MLCEngineInterface,
  CreateMLCEngine,
  ChatCompletionMessageParam,
  prebuiltAppConfig,
} from "@mlc-ai/web-llm";
import { ModelCacheManager } from "./common/modelCache.js";

let engine: MLCEngineInterface | null = null;
let isEngineReady = false;
const modelCacheManager = new ModelCacheManager();
const selectedModel = "Qwen2-0.5B-Instruct-q4f16_1-MLC";

// Initialize the WebLLM engine
async function initializeEngine() {
  if (engine && isEngineReady) {
    return engine;
  }

  try {
    // Check if model is cached first
    const isCached = await modelCacheManager.isCached();
    console.log(`Model cache status:`, isCached ? 'CACHED' : 'NOT CACHED');

    // Send progress updates to popup if it's open
    const progressCallback = (report: any) => {
      console.log(`Loading model: ${report.text} (${(report.progress * 100).toFixed(1)}%)`);
      
      // Broadcast progress to popup
      chrome.runtime.sendMessage({
        type: 'modelLoadProgress',
        progress: report.progress,
        text: report.text
      }).catch(() => {
        // Popup might not be open, that's ok
      });

      if (report.progress === 1.0) {
        isEngineReady = true;
      }
    };

    if (isCached) {
      console.log('Using cached model weights');
    } else {
      console.log('Model not cached, will download fresh');
    }

    // Create the engine (WebLLM will handle caching internally)
    engine = await CreateMLCEngine(selectedModel, {
      initProgressCallback: progressCallback
    });

    return engine;
  } catch (error) {
    console.error("Failed to initialize WebLLM engine:", error);
    throw error;
  }
}

// Generate comment drafts using the WebLLM engine
async function generateCommentDrafts(
  post: string,
  count: number,
  personas: string[]
): Promise<string[]> {
  const currentEngine = await initializeEngine();
  const comments: string[] = [];

  for (let i = 0; i < count; i++) {
    try {
      // Select persona for this comment (cycle through if needed)
      const persona = personas[i % personas.length] || "professional";
      
      // Create prompt for comment generation
      const prompt = `You are writing a ${persona} comment on this LinkedIn post:

"${post}"

Write a thoughtful, engaging comment that:
- Is ${persona} in tone
- Adds value to the conversation
- Is 1-3 sentences long
- Feels natural and authentic
- Does not repeat the post content

Comment:`;

      const chatHistory: ChatCompletionMessageParam[] = [
        { role: "user", content: prompt }
      ];

      const completion = await currentEngine.chat.completions.create({
        stream: false,
        messages: chatHistory,
        max_tokens: 150,
      });

      const comment = completion.choices[0]?.message?.content?.trim();
      if (comment) {
        comments.push(comment);
      }
    } catch (error) {
      console.error(`Failed to generate comment ${i + 1}:`, error);
      // Add a fallback comment if generation fails
      const fallbackPersona = personas[i % personas.length] || "professional";
      comments.push(`Great insights! Thanks for sharing this ${fallbackPersona} perspective.`);
    }
  }

  return comments;
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'draftComment') {
    const { post, count, personas } = message;
    
    generateCommentDrafts(post, count, personas)
      .then((comments) => {
        sendResponse({ comments });
      })
      .catch((error) => {
        console.error('Error generating comments:', error);
        sendResponse({ error: error.message });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }

  if (message.type === 'getCacheStatus') {
    modelCacheManager.isCached()
      .then((isCached) => {
        sendResponse({ isCached, model: selectedModel });
      })
      .catch((error) => {
        console.error('Error checking cache status:', error);
        sendResponse({ isCached: false, error: error.message });
      });
    
    return true;
  }

  if (message.type === 'clearCache') {
    modelCacheManager.clearCache()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error clearing cache:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }
});

// Initialize engine when service worker starts
initializeEngine().catch(console.error);
