/**
 * LinkedIn Comment Inserter
 * Handles random AI comment insertion into LinkedIn comment boxes
 */

import { getLiCommentBox } from './detector';
import { draftComments } from '../llmService';

/**
 * Inserts a random AI-generated comment into the LinkedIn comment box
 * Uses settings from chrome.storage.sync for tone and count
 */
export async function insertRandomComment(): Promise<void> {
  const { box, post } = getLiCommentBox();
  
  if (!box || !post) {
    console.warn('No LinkedIn comment box or post content found');
    return;
  }

  try {
    // Get settings from storage
    const settings = await chrome.storage.sync.get(['tone', 'count']);
    const tone = settings.tone || 'friendly';
    const count = settings.count || 3;
    
    // Generate comment options
    const arr = await draftComments(post, count, [tone]);
    
    if (arr.length === 0) {
      console.warn('No comments generated');
      return;
    }

    // Select random comment
    const randomComment = arr[Math.floor(Math.random() * arr.length)];
    
    // Insert comment into the box
    box.textContent = randomComment;
    
    // Trigger input event to notify LinkedIn's systems
    box.dispatchEvent(new InputEvent('input', { bubbles: true }));
    
  } catch (error) {
    console.error('Failed to insert AI comment:', error);
  }
}

/**
 * Creates and injects the AI button into LinkedIn comment boxes
 */
export function injectAIButton(): void {
  // Find all comment boxes that don't already have an AI button
  const commentBoxes = document.querySelectorAll('.comments-comment-box__text-editor:not([data-ai-injected])');
  
  commentBoxes.forEach((box) => {
    const commentBox = box as HTMLElement;
    
    // Mark as processed
    commentBox.setAttribute('data-ai-injected', 'true');
    
    // Create shadow DOM for isolated styling
    const shadowHost = document.createElement('div');
    shadowHost.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 1000;
    `;
    
    // Position the shadow host relative to the comment box
    if (commentBox.style.position !== 'absolute' && commentBox.style.position !== 'relative') {
      commentBox.style.position = 'relative';
    }
    
    commentBox.appendChild(shadowHost);
    
    // Create shadow DOM
    const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
    
    // Create AI button
    const aiButton = document.createElement('button');
    aiButton.innerHTML = '✨ AI';
    aiButton.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    // Add hover effects
    aiButton.addEventListener('mouseenter', () => {
      aiButton.style.transform = 'translateY(-1px)';
      aiButton.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
    });
    
    aiButton.addEventListener('mouseleave', () => {
      aiButton.style.transform = 'translateY(0)';
      aiButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    });
    
    // Add click handler
    aiButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show loading state
      const originalText = aiButton.innerHTML;
      aiButton.innerHTML = '⏳';
      aiButton.disabled = true;
      
      try {
        await insertRandomComment();
      } catch (error) {
        console.error('AI comment insertion failed:', error);
      } finally {
        // Restore button state
        aiButton.innerHTML = originalText;
        aiButton.disabled = false;
      }
    });
    
    shadowRoot.appendChild(aiButton);
  });
}

/**
 * Initialize the comment inserter by setting up observers and injecting buttons
 */
export function initializeCommentInserter(): void {
  // Initial injection
  injectAIButton();
  
  // Set up observer for dynamically loaded comment boxes
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false;
    
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          
          // Check if the added node contains comment boxes
          if (element.querySelector('.comments-comment-box__text-editor') ||
              element.classList.contains('comments-comment-box__text-editor')) {
            shouldInject = true;
          }
        }
      });
    });
    
    if (shouldInject) {
      // Delay injection to ensure DOM is ready
      setTimeout(injectAIButton, 100);
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
