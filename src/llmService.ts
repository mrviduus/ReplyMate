/**
 * LLM Service
 * Handles AI-powered comment generation for LinkedIn posts
 */

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
