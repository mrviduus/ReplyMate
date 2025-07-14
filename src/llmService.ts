/**
 * LLM Service
 * Handles AI-powered comment generation for LinkedIn posts
 */

import { defaultRateLimiter } from './common/rateLimiter';
import { showToast } from './common/toast';

/**
 * Generates draft comments for a LinkedIn post using AI
 * @param post - The LinkedIn post content to comment on
 * @param n - Number of comment drafts to generate
 * @param personas - Array of persona styles for comment generation
 * @returns Promise resolving to array of generated comment drafts
 */
export async function draftComments(
  post: string, 
  n: number, 
  personas: string[]
): Promise<string[]> {
  // Check rate limiter before making request
  if (!defaultRateLimiter.allowRequest()) {
    showToast({
      message: 'Slow down',
      type: 'warning',
      duration: 2000
    });
    return Promise.reject(new Error('Rate limit exceeded'));
  }

  return new Promise((resolve, reject) => {
    // Send message to service worker to generate comments
    chrome.runtime.sendMessage(
      {
        type: 'draftComment',
        post,
        count: n,
        personas
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        
        resolve(response.comments || []);
      }
    );
  });
}
