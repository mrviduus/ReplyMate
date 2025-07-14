/**
 * LinkedIn Comment Inserter
 * Handles random AI comment insertion into LinkedIn comment boxes
 */

import { getLiCommentBox } from './detector';
import { draftComments } from '../llmService';
import { showToast } from '../common/toast';

// Track the last state for undo functionality
interface UndoState {
  box: HTMLElement;
  previousText: string;
  insertedText: string;
}

let lastUndoState: UndoState | null = null;

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
    // Store previous state for undo
    const previousText = box.textContent || '';
    
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
    
    // Store undo state
    lastUndoState = {
      box,
      previousText,
      insertedText: randomComment
    };
    
    // Trigger input event to notify LinkedIn's systems
    box.dispatchEvent(new InputEvent('input', { bubbles: true }));
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(randomComment);
    } catch (clipboardError) {
      console.warn('Failed to copy to clipboard:', clipboardError);
    }
    
    // Show success toast with undo option
    showToast({
      message: 'Inserted',
      type: 'success',
      duration: 6000,
      action: {
        label: 'Undo',
        callback: undoLastInsertion
      }
    });
    
  } catch (error) {
    console.error('Failed to insert AI comment:', error);
  }
}

/**
 * Undoes the last comment insertion
 */
export function undoLastInsertion(): void {
  if (!lastUndoState) {
    showToast({
      message: 'Nothing to undo',
      type: 'info',
      duration: 2000
    });
    return;
  }

  // Restore previous text
  lastUndoState.box.textContent = lastUndoState.previousText;
  
  // Trigger input event
  lastUndoState.box.dispatchEvent(new InputEvent('input', { bubbles: true }));
  
  // Clear undo state
  lastUndoState = null;
  
  showToast({
    message: 'Undone',
    type: 'info',
    duration: 2000
  });
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
      display: flex;
      gap: 4px;
    `;
    
    // Position the shadow host relative to the comment box
    if (commentBox.style.position !== 'absolute' && commentBox.style.position !== 'relative') {
      commentBox.style.position = 'relative';
    }
    
    commentBox.appendChild(shadowHost);
    
    // Create shadow DOM
    const shadowRoot = shadowHost.attachShadow({ mode: 'closed' });
    
    // Common button styles
    const buttonBaseStyle = `
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
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 4px;';
    
    // Create AI button
    const aiButton = document.createElement('button');
    aiButton.innerHTML = '✨ AI';
    aiButton.style.cssText = buttonBaseStyle;
    
    // Create regenerate button
    const regenerateButton = document.createElement('button');
    regenerateButton.innerHTML = '🔄';
    regenerateButton.style.cssText = buttonBaseStyle;
    regenerateButton.title = 'Regenerate comment';
    
    // Add hover effects for both buttons
    [aiButton, regenerateButton].forEach(button => {
      button.addEventListener('mouseenter', () => {
        button.style.transform = 'translateY(-1px)';
        button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });
    });
    
    // AI button click handler
    aiButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show loading state
      const originalText = aiButton.innerHTML;
      aiButton.innerHTML = '⏳';
      aiButton.disabled = true;
      regenerateButton.disabled = true;
      
      try {
        await insertRandomComment();
      } catch (error) {
        console.error('AI comment insertion failed:', error);
      } finally {
        // Restore button state
        aiButton.innerHTML = originalText;
        aiButton.disabled = false;
        regenerateButton.disabled = false;
      }
    });
    
    // Regenerate button click handler
    regenerateButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Show loading state
      const originalText = regenerateButton.innerHTML;
      regenerateButton.innerHTML = '⏳';
      regenerateButton.disabled = true;
      aiButton.disabled = true;
      
      try {
        await insertRandomComment();
      } catch (error) {
        console.error('AI comment regeneration failed:', error);
      } finally {
        // Restore button state
        regenerateButton.innerHTML = originalText;
        regenerateButton.disabled = false;
        aiButton.disabled = false;
      }
    });
    
    buttonContainer.appendChild(aiButton);
    buttonContainer.appendChild(regenerateButton);
    shadowRoot.appendChild(buttonContainer);
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
