// LinkedIn Content Script for ReplyMate Extension
// Handles post detection, reply generation, and UI injection

console.log('ReplyMate LinkedIn content script loaded');

interface LinkedInComment {
  id: string;
  text: string;
  likeCount: number;
  element: HTMLElement;
}

interface LinkedInPost {
  id: string;
  element: HTMLElement;
  textContent: string;
  hasReplyButton: boolean;
  comments?: LinkedInComment[];
}

class LinkedInReplyMate {
  private posts: Map<string, LinkedInPost> = new Map();
  private observer: MutationObserver | null = null;
  private isProcessing = false;

  constructor() {
    this.showComplianceWarning();
    this.init();
  }

  private showComplianceWarning(): void {
    console.warn(
      "⚠️ ReplyMate Extension Notice:\n" +
      "Automated interactions may violate LinkedIn's Terms of Service.\n" +
      "Use this extension responsibly and at your own risk."
    );
  }

  private notifyBackgroundReady(): void {
    console.log('\ud83d\udd14 Notifying background that LinkedIn content script is ready...');
    chrome.runtime.sendMessage({
      action: 'linkedinContentScriptReady'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to notify background:', chrome.runtime.lastError);
        // Retry notification after a short delay
        setTimeout(() => this.notifyBackgroundReady(), 2000);
      } else if (response?.engineReady) {
        console.log('\u2705 Background confirmed: AI engine is ready');
      } else {
        console.log('\u26a0\ufe0f Background response:', response);
      }
    });
  }

  private init(): void {
    // Initialize when DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  private setup(): void {
    // Notify background that LinkedIn content script is ready
    this.notifyBackgroundReady();

    // Start observing for posts
    this.observePosts();

    // Process existing posts
    this.processVisiblePosts();

    // Listen for messages from background/popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "generateReply") {
        this.handleGenerateReply(request.postId, request.postContent);
        sendResponse({ status: "processing" });
      }
      return true;
    });

    // Listen for content requests from popup
    chrome.runtime.onConnect.addListener((port) => {
      port.onMessage.addListener((_msg) => {
        port.postMessage({ contents: document.body.innerText });
      });
    });
  }

  private observePosts(): void {
    const feedContainer = document.querySelector('main[role="main"]') || 
                         document.querySelector('.scaffold-layout__main') ||
                         document.body;
    
    this.observer = new MutationObserver((mutations) => {
      // Debounce processing to avoid excessive calls
      this.debounce(() => this.processVisiblePosts(), 500)();
    });

    this.observer.observe(feedContainer, {
      childList: true,
      subtree: true
    });
  }

  private processVisiblePosts(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // LinkedIn post selectors - multiple selectors for different layouts
      const postSelectors = [
        '[data-id*="urn:li:activity"]',
        '[data-urn*="urn:li:activity"]',
        '.feed-shared-update-v2',
        'div[class*="occludable-update"]',
        '.feed-shared-update',
        '[data-test-id="main-feed-activity-card"]'
      ];

      postSelectors.forEach(selector => {
        const posts = document.querySelectorAll(selector);
        posts.forEach((post) => this.processPost(post as HTMLElement));
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private processPost(postElement: HTMLElement): void {
    const postId = this.getPostId(postElement);
    if (!postId || this.posts.has(postId)) return;

    const textContent = this.extractPostText(postElement);
    if (!textContent || textContent.length < 10) return; // Skip very short posts

    const post: LinkedInPost = {
      id: postId,
      element: postElement,
      textContent: textContent.substring(0, 500), // Limit text length
      hasReplyButton: false
    };

    this.posts.set(postId, post);
    this.injectReplyButton(post);
  }

  private getPostId(element: HTMLElement): string | null {
    return element.getAttribute('data-id') || 
           element.getAttribute('data-urn') || 
           element.getAttribute('data-activity-urn') ||
           element.id || 
           `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractPostText(postElement: HTMLElement): string {
    // Look for post content in various possible locations
    const contentSelectors = [
      '.feed-shared-text',
      '[data-test-id="main-feed-activity-content"]',
      '.feed-shared-update-v2__description',
      '.feed-shared-text__text-view',
      'span[dir="ltr"]',
      '.feed-shared-update-v2__commentary',
      '.update-components-text'
    ];

    for (const selector of contentSelectors) {
      const contentElement = postElement.querySelector(selector);
      if (contentElement?.textContent) {
        const text = contentElement.textContent.trim();
        if (text.length > 10) { // Only return meaningful text
          return text;
        }
      }
    }

    return "";
  }

  private extractComments(postElement: HTMLElement): LinkedInComment[] {
    const comments: LinkedInComment[] = [];
    
    // LinkedIn comment selectors
    const commentSelectors = [
      '.comments-comment-item',
      '[data-test-id="comments-comment-item"]',
      '.comment-item',
      'article[class*="comments-comment-item"]'
    ];
    
    for (const selector of commentSelectors) {
      const commentElements = postElement.querySelectorAll(selector);
      
      commentElements.forEach((commentEl: Element) => {
        const comment = this.extractCommentData(commentEl as HTMLElement);
        if (comment) {
          comments.push(comment);
        }
      });
    }
    
    // Sort by like count (highest first)
    return comments.sort((a, b) => b.likeCount - a.likeCount);
  }

  private extractCommentData(commentElement: HTMLElement): LinkedInComment | null {
    // Extract comment text
    const textSelectors = [
      '.comments-comment-item__main-content',
      '.comments-comment-texteditor',
      '[data-test-id="comment-text"]',
      '.comments-comment-item-content-body'
    ];
    
    let commentText = '';
    for (const selector of textSelectors) {
      const textEl = commentElement.querySelector(selector);
      if (textEl?.textContent) {
        commentText = textEl.textContent.trim();
        break;
      }
    }
    
    if (!commentText) return null;
    
    // Extract like count
    const likeCount = this.extractLikeCount(commentElement);
    
    return {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: commentText,
      likeCount: likeCount,
      element: commentElement
    };
  }

  private extractLikeCount(commentElement: HTMLElement): number {
    // LinkedIn like count selectors
    const likeSelectors = [
      '.social-counts-reactions__count',
      '[data-test-id="social-actions__reaction-count"]',
      '.reactions-react-button span[aria-hidden="true"]',
      '.comments-comment-social-bar__reactions-count'
    ];
    
    for (const selector of likeSelectors) {
      const likeEl = commentElement.querySelector(selector);
      if (likeEl?.textContent) {
        // Parse the number (might be "12", "1.2K", etc.)
        return this.parseLikeCount(likeEl.textContent);
      }
    }
    
    return 0;
  }

  private parseLikeCount(text: string): number {
    text = text.trim().toLowerCase();
    
    // Handle K (thousands) and M (millions)
    if (text.includes('k')) {
      return Math.round(parseFloat(text.replace('k', '')) * 1000);
    }
    if (text.includes('m')) {
      return Math.round(parseFloat(text.replace('m', '')) * 1000000);
    }
    
    return parseInt(text, 10) || 0;
  }

  private injectReplyButton(post: LinkedInPost): void {
    // Find the comment/action area
    const actionSelectors = [
      '.feed-shared-social-actions',
      '.social-details-social-activity',
      '[data-test-id="social-actions"]',
      '.feed-shared-social-action-bar',
      '.social-actions-buttons'
    ];

    let actionContainer: Element | null = null;
    for (const selector of actionSelectors) {
      actionContainer = post.element.querySelector(selector);
      if (actionContainer) break;
    }

    if (!actionContainer) return;

    // Check if button already exists
    if (actionContainer.querySelector('.replymate-generate-btn')) return;

    // Create reply button
    const replyButton = this.createReplyButton(post.id);
    
    // Insert the button as the last action button in the action bar
    actionContainer.appendChild(replyButton);

    post.hasReplyButton = true;
  }

  private createReplyButton(postId: string): HTMLElement {
    // Create the action button container following LinkedIn's structure
    const actionButtonContainer = document.createElement('div');
    actionButtonContainer.className = 'feed-shared-social-action-bar__action-button feed-shared-social-action-bar--new-padding';
    
    const button = document.createElement('button');
    button.className = 'replymate-generate-btn artdeco-button artdeco-button--muted artdeco-button--3 artdeco-button--tertiary social-actions-button flex-wrap';
    button.setAttribute('aria-label', 'Generate AI reply with ReplyMate');
    button.setAttribute('type', 'button');
    button.innerHTML = `
      <svg role="none" aria-hidden="true" class="artdeco-button__icon replymate-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
      <span class="artdeco-button__text">
        <span class="artdeco-button__text social-action-button__text replymate-button-text">Reply</span>
      </span>
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleGenerateClick(postId);
    });

    // Add keyboard accessibility
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.handleGenerateClick(postId);
      }
    });

    actionButtonContainer.appendChild(button);
    return actionButtonContainer;
  }

  private handleGenerateClick(postId: string): void {
    const post = this.posts.get(postId);
    if (!post) return;

    // Show loading state
    this.updateButtonState(postId, 'loading');

    // Extract comments for smart analysis
    const comments = this.extractComments(post.element);
    post.comments = comments;

    // Get top performing comments (with likes > 0)
    const topComments = comments
      .filter(c => c.likeCount > 0)
      .slice(0, 5) // Get top 5 comments
      .map(c => ({
        text: c.text.substring(0, 200), // Limit text length
        likeCount: c.likeCount
      }));

    // Check if we should use smart comment analysis
    const useSmartAnalysis = topComments.length >= 2; // Need at least 2 liked comments

    // First check engine status with error handling and auto-initialization
    try {
      chrome.runtime.sendMessage({
        action: 'checkEngineStatus'
      }, (statusResponse) => {
        if (chrome.runtime.lastError) {
          console.warn('Extension context issue:', chrome.runtime.lastError);
          // Try to re-initialize the connection
          this.notifyBackgroundReady();
          this.showToast('Reconnecting to AI engine...', 'error');
          // Retry after a short delay
          setTimeout(() => this.handleGenerateClick(postId), 2000);
          return;
        }

        if (!statusResponse?.engineReady) {
          // Engine not ready, notify background to initialize
          this.showToast('Initializing AI model. This may take a moment...', 'error');
          this.notifyBackgroundReady();
        } else if (statusResponse?.initializing) {
          this.showToast('AI model is loading. Please wait...', 'error');
        }
      });
    } catch (error) {
      console.error('Error checking engine status:', error);
      this.showToast('Extension error. Please refresh the page.', 'error');
      this.updateButtonState(postId, 'error');
      return;
    }

    // Add timeout for generation request
    const requestTimeout = setTimeout(() => {
      this.showToast('Request timed out. AI model may still be loading.', 'error');
      this.updateButtonState(postId, 'error');
    }, 30000); // 30 second timeout

    if (useSmartAnalysis) {
      // Show user that we're using smart analysis
      this.showToast('Analyzing top-performing comments for better reply...', 'success');
      
      // Send request with comment analysis
      try {
        chrome.runtime.sendMessage({
          action: 'generateLinkedInReplyWithComments',
          postId: postId,
          postContent: post.textContent,
          topComments: topComments
        }, (response) => {
          clearTimeout(requestTimeout);
          if (chrome.runtime.lastError) {
            console.warn('Runtime error:', chrome.runtime.lastError);
            this.showToast('Extension connection lost. Please refresh the page.', 'error');
            this.updateButtonState(postId, 'error');
            return;
          }
          this.handleReplyResponse(postId, response);
        });
      } catch (error) {
        clearTimeout(requestTimeout);
        console.error('Error sending smart analysis request:', error);
        this.showToast('Failed to generate reply. Please try again.', 'error');
        this.updateButtonState(postId, 'error');
      }
    } else {
      // Fall back to regular generation
      try {
        chrome.runtime.sendMessage({
          action: 'generateLinkedInReply',
          postId: postId,
          postContent: post.textContent
        }, (response) => {
          clearTimeout(requestTimeout);
          if (chrome.runtime.lastError) {
            console.warn('Runtime error:', chrome.runtime.lastError);
            this.showToast('Extension connection lost. Please refresh the page.', 'error');
            this.updateButtonState(postId, 'error');
            return;
          }
          this.handleReplyResponse(postId, response);
        });
      } catch (error) {
        clearTimeout(requestTimeout);
        console.error('Error sending generation request:', error);
        this.showToast('Failed to generate reply. Please try again.', 'error');
        this.updateButtonState(postId, 'error');
      }
    }
  }

  private handleReplyResponse(postId: string, response: any): void {
    const post = this.posts.get(postId);
    if (!post) return;

    try {
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        this.updateButtonState(postId, 'error');
        this.showToast('Extension connection lost. Please refresh the page.', 'error');
        return;
      }

      if (!response) {
        this.updateButtonState(postId, 'error');
        this.showToast('No response received from AI service', 'error');
        return;
      }

      if (response?.reply) {
        this.showReplyPanel(post, response.reply);
        this.updateButtonState(postId, 'success');
        
        // Show special message if based on comment analysis
        if (response.basedOnComments) {
          this.showToast(
            `Smart reply generated based on ${response.commentCount} top comments!`, 
            'success'
          );
        }
        
        // Show initialization warning if applicable
        if (response.error && response.isInitializing) {
          this.showToast('AI is still loading. This reply is a suggestion. Try again for AI-powered responses.', 'error');
        }
      } else if (response?.error) {
        console.error('Reply generation error:', response.error);
        this.updateButtonState(postId, 'error');
        
        // Provide user-friendly error messages
        let errorMessage = response.error;
        if (response.error.includes('timeout')) {
          errorMessage = 'AI model is still loading. Please wait and try again.';
        } else if (response.error.includes('Engine initialization')) {
          errorMessage = 'AI model failed to load. Please reload the extension.';
        } else if (response.error.includes('Extension context')) {
          errorMessage = 'Extension needs to be reloaded. Please refresh the page.';
        }
        
        this.showToast(errorMessage, 'error');
      } else {
        this.updateButtonState(postId, 'error');
        this.showToast('Unexpected response format', 'error');
      }
    } catch (error) {
      console.error('Error handling reply response:', error);
      this.updateButtonState(postId, 'error');
      this.showToast('Failed to process response. Please try again.', 'error');
    }
  }

  private updateButtonState(postId: string, state: 'loading' | 'success' | 'error' | 'default'): void {
    const post = this.posts.get(postId);
    if (!post) return;

    const button = post.element.querySelector('.replymate-generate-btn');
    if (!button) return;

    // Reset classes
    button.classList.remove('loading', 'success', 'error');
    
    switch (state) {
      case 'loading':
        button.classList.add('loading');
        (button as HTMLButtonElement).disabled = true;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="replymate-icon spinning">
            <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z"/>
          </svg>
          <span>Generating...</span>
        `;
        break;
      case 'success':
        button.classList.add('success');
        (button as HTMLButtonElement).disabled = false;
        setTimeout(() => this.updateButtonState(postId, 'default'), 2000);
        break;
      case 'error':
        button.classList.add('error');
        (button as HTMLButtonElement).disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="replymate-icon">
            <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2m3.59,5L12,10.59 8.41,7 7,8.41l3.59,3.59L7,15.59 8.41,17 12,13.41l3.59,3.59L17,15.59l-3.59-3.59L17,8.41 15.59,7z"/>
          </svg>
          <span>Retry</span>
        `;
        setTimeout(() => this.updateButtonState(postId, 'default'), 3000);
        break;
      default:
        (button as HTMLButtonElement).disabled = false;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" class="replymate-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Reply</span>
        `;
    }
  }

  private showReplyPanel(post: LinkedInPost, generatedReply: string): void {
    // Remove existing panel if any
    const existingPanel = post.element.querySelector('.replymate-panel');
    existingPanel?.remove();

    // Check if reply was based on comment analysis
    const hasCommentAnalysis = post.comments && post.comments.filter(c => c.likeCount > 0).length > 0;
    const commentCount = post.comments ? post.comments.filter(c => c.likeCount > 0).length : 0;

    // Create new panel
    const panel = document.createElement('div');
    panel.className = 'replymate-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Generated reply panel');
    panel.innerHTML = `
      <div class="replymate-panel-content">
        ${hasCommentAnalysis ? `
          <div class="replymate-smart-indicator">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
            </svg>
            Smart reply based on ${commentCount} top comments
          </div>
        ` : ''}
        <div class="replymate-reply-text" role="textbox" aria-readonly="true" tabindex="0">${this.escapeHtml(generatedReply)}</div>
        <div class="replymate-panel-actions">
          <button class="replymate-btn replymate-regenerate" data-action="regenerate" aria-label="Regenerate reply">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            Regenerate
          </button>
          <button class="replymate-btn replymate-copy" data-action="copy" aria-label="Copy reply to clipboard">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Copy
          </button>
          <button class="replymate-btn replymate-insert" data-action="insert" aria-label="Insert reply into comment box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Insert
          </button>
          <button class="replymate-btn replymate-close" data-action="close" aria-label="Close reply panel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
            </svg>
            Close
          </button>
        </div>
      </div>
    `;

    // Add event listeners for panel actions
    panel.querySelectorAll('.replymate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action;
        this.handlePanelAction(action!, post, generatedReply, panel);
      });
    });

    // Insert panel after the post content
    const insertLocation = post.element.querySelector('.feed-shared-update-v2__content') || 
                          post.element.querySelector('.update-components-text') ||
                          post.element;
    
    if (insertLocation.parentElement) {
      insertLocation.parentElement.insertBefore(panel, insertLocation.nextSibling);
    } else {
      post.element.appendChild(panel);
    }

    // Animate panel appearance
    requestAnimationFrame(() => {
      panel.classList.add('replymate-panel-show');
    });
  }

  private handlePanelAction(action: string, post: LinkedInPost, reply: string, panel: HTMLElement): void {
    switch (action) {
      case 'regenerate':
        this.handleGenerateClick(post.id);
        break;
      case 'copy':
        this.copyToClipboard(reply);
        break;
      case 'insert':
        this.insertIntoCommentBox(post, reply);
        break;
      case 'close':
        this.closeReplyPanel(panel);
        break;
    }
  }

  private closeReplyPanel(panel: HTMLElement): void {
    panel.classList.remove('replymate-panel-show');
    panel.classList.add('replymate-panel-hiding');
    
    setTimeout(() => {
      panel.remove();
    }, 300);
  }

  private copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Reply copied to clipboard!', 'success');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.showToast('Failed to copy reply', 'error');
    });
  }

  private insertIntoCommentBox(post: LinkedInPost, reply: string): void {
    // First, try to find and click the comment button to open the comment box
    const commentButton = post.element.querySelector('button[aria-label*="Comment"], button[aria-label*="comment"]') as HTMLButtonElement;
    
    if (commentButton) {
      commentButton.click();
      
      // Wait for comment box to appear and then insert text
      setTimeout(() => {
        const commentSelectors = [
          '.ql-editor[contenteditable="true"]',
          '[contenteditable="true"][role="textbox"]',
          'textarea[placeholder*="comment"]',
          'textarea[placeholder*="Comment"]',
          '.mentions-texteditor__contenteditable'
        ];

        let commentBox: HTMLElement | null = null;
        for (const selector of commentSelectors) {
          commentBox = post.element.querySelector(selector) as HTMLElement;
          if (commentBox) break;
        }

        if (commentBox) {
          if (commentBox.tagName === 'TEXTAREA') {
            (commentBox as HTMLTextAreaElement).value = reply;
            commentBox.dispatchEvent(new Event('input', { bubbles: true }));
            commentBox.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            commentBox.textContent = reply;
            commentBox.dispatchEvent(new Event('input', { bubbles: true }));
            commentBox.dispatchEvent(new Event('blur', { bubbles: true }));
          }
          
          // Focus the comment box
          commentBox.focus();
          this.showToast('Reply inserted! You can edit before posting.', 'success');
        } else {
          this.showToast('Could not find comment box. Try clicking comment first.', 'error');
        }
      }, 800); // Wait a bit longer for LinkedIn's UI to load
    } else {
      this.showToast('Could not find comment button', 'error');
    }
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.createElement('div');
    toast.className = `replymate-toast replymate-toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('replymate-toast-show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('replymate-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  private handleGenerateReply(postId: string, postContent: string): void {
    // This will be called from background script for additional processing
    const post = this.posts.get(postId);
    if (post) {
      this.updateButtonState(postId, 'loading');
    }
  }

  // Public method to clean up when page unloads
  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.posts.clear();
  }
}

// Initialize when on LinkedIn
if (window.location.hostname.includes('linkedin.com')) {
  const linkedInReplyMate = new LinkedInReplyMate();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    linkedInReplyMate.destroy();
  });
}

// Debug function to test if custom prompts are being used
function testCustomPrompts() {
  console.log('🧪 Testing custom prompts integration...');
  
  // Create a test post content
  const testPostContent = "This is a test post to verify custom prompts are working correctly.";
  
  chrome.runtime.sendMessage({
    action: 'generateLinkedInReply',
    postContent: testPostContent
  }, (response) => {
    console.log('📬 Test response received:', response);
    if (response?.reply) {
      console.log('✅ Reply generated:', response.reply);
      alert(`Test successful! Generated reply:\n\n${response.reply}\n\nCheck the console for details about which prompt was used.`);
    } else {
      console.error('❌ Test failed:', response);
      alert('Test failed! Check console for details.');
    }
  });
}

// Function to verify prompts are stored correctly
function verifyStoredPrompts() {
  console.log('🔍 Verifying stored prompts...');
  
  chrome.runtime.sendMessage({ action: 'verifyPrompts' }, (response) => {
    console.log('📊 Verification Response:', response);
    
    if (response?.hasCustomPrompts) {
      console.log('✅ Custom prompts ARE stored');
      console.log('🎯 Using custom standard:', response.isUsingCustomStandard);
      console.log('🎯 Using custom comments:', response.isUsingCustomComments);
      alert(`Verification Results:\n✅ Custom prompts found!\n🎯 Standard: ${response.isUsingCustomStandard ? 'CUSTOM' : 'DEFAULT'}\n🎯 Comments: ${response.isUsingCustomComments ? 'CUSTOM' : 'DEFAULT'}`);
    } else {
      console.warn('⚠️ No custom prompts found - using defaults');
      alert('⚠️ No custom prompts found.\nGo to ReplyMate settings and save some custom prompts first!');
    }
  });
}

// Make the test functions available globally for debugging
(window as any).testReplyMatePrompts = testCustomPrompts;
(window as any).verifyReplyMatePrompts = verifyStoredPrompts;

console.log('💡 ReplyMate Debug Functions Available:');
console.log('   - window.testReplyMatePrompts() - Test prompt generation');
console.log('   - window.verifyReplyMatePrompts() - Verify stored prompts');
