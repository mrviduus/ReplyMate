// ReplyMate LinkedIn Content Script
console.log('ReplyMate LinkedIn content script loaded');

interface LinkedInPost {
  id: string;
  element: HTMLElement;
  textContent: string;
  hasReplyButton: boolean;
}

class LinkedInReplyMate {
  private posts: Map<string, LinkedInPost> = new Map();
  private observer: MutationObserver | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setup());
    } else {
      this.setup();
    }
  }

  private setup(): void {
    this.observePosts();
    this.processExistingPosts();
  }

  private observePosts(): void {
    this.observer = new MutationObserver(() => {
      this.processExistingPosts();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private processExistingPosts(): void {
    const feedPosts = document.querySelectorAll('div[data-id*="urn:li:activity"]');
    
    feedPosts.forEach(postElement => {
      const htmlElement = postElement as HTMLElement;
      this.processPost(htmlElement);
    });
  }

  private processPost(postElement: HTMLElement): void {
    const dataId = postElement.getAttribute('data-id');
    if (!dataId) return;

    // Skip if already processed
    if (this.posts.has(dataId)) return;

    const textContent = this.extractPostText(postElement);
    if (!textContent) return;

    const post: LinkedInPost = {
      id: dataId,
      element: postElement,
      textContent: textContent,
      hasReplyButton: false
    };

    this.posts.set(dataId, post);
    this.addReplyButton(post);
  }

  private extractPostText(postElement: HTMLElement): string {
    const textSelectors = [
      '.feed-shared-text',
      '.feed-shared-text__text-view',
      '.feed-shared-update-v2__description-wrapper',
      '[data-test-id="main-feed-activity-card"]'
    ];

    for (const selector of textSelectors) {
      const textElement = postElement.querySelector(selector);
      if (textElement) {
        return textElement.textContent?.trim() || '';
      }
    }

    return '';
  }

  private addReplyButton(post: LinkedInPost): void {
    // Find comment input area
    const commentSection = post.element.querySelector('.comments-comment-box, .comment-compose-publisher');
    if (!commentSection) return;

    // Skip if button already exists
    if (commentSection.querySelector('.replymate-button')) return;

    // Create reply button
    const replyButton = document.createElement('button');
    replyButton.className = 'replymate-button';
    replyButton.textContent = 'Generate Reply';
    replyButton.style.cssText = `
      background: #0A66C2;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      margin: 8px 0;
      transition: background 0.2s;
    `;

    replyButton.addEventListener('mouseover', () => {
      replyButton.style.background = '#084A8C';
    });

    replyButton.addEventListener('mouseout', () => {
      replyButton.style.background = '#0A66C2';
    });

    replyButton.addEventListener('click', () => {
      this.handleReplyGeneration(post, replyButton);
    });

    // Insert button
    commentSection.insertBefore(replyButton, commentSection.firstChild);
    post.hasReplyButton = true;
  }

  private async handleReplyGeneration(post: LinkedInPost, button: HTMLButtonElement): Promise<void> {
    const originalText = button.textContent;
    button.textContent = 'Generating...';
    button.disabled = true;

    try {
      const response = await this.requestReplyGeneration(post.textContent);
      
      if (response.success) {
        this.displayReply(post, response.reply, button);
      } else {
        throw new Error(response.error || 'Failed to generate reply');
      }
    } catch (error) {
      console.error('Error generating reply:', error);
      button.textContent = 'Try Again';
      setTimeout(() => {
        button.textContent = originalText || 'Generate Reply';
        button.disabled = false;
      }, 2000);
    }
  }

  private requestReplyGeneration(postContent: string): Promise<any> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'generateStandardReply',
        postContent: postContent
      }, resolve);
    });
  }

  private displayReply(post: LinkedInPost, reply: string, button: HTMLButtonElement): void {
    // Create reply display container
    const replyContainer = document.createElement('div');
    replyContainer.className = 'replymate-reply-container';
    replyContainer.style.cssText = `
      background: #F3F6F8;
      border: 1px solid #D0D7DC;
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      font-size: 14px;
      line-height: 1.4;
    `;

    const replyText = document.createElement('div');
    replyText.textContent = reply;
    replyText.style.cssText = `
      margin-bottom: 8px;
      color: #191919;
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    // Copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy';
    copyButton.style.cssText = `
      background: #FFF;
      border: 1px solid #0A66C2;
      color: #0A66C2;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;

    copyButton.addEventListener('click', () => {
      navigator.clipboard.writeText(reply);
      copyButton.textContent = 'Copied!';
      setTimeout(() => copyButton.textContent = 'Copy', 1000);
    });

    // Insert button
    const insertButton = document.createElement('button');
    insertButton.textContent = 'Insert';
    insertButton.style.cssText = `
      background: #0A66C2;
      border: none;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;

    insertButton.addEventListener('click', () => {
      this.insertReplyIntoComment(post, reply);
      replyContainer.remove();
      this.resetButton(button);
    });

    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(insertButton);
    replyContainer.appendChild(replyText);
    replyContainer.appendChild(buttonContainer);

    // Insert reply container after button
    button.parentElement?.insertBefore(replyContainer, button.nextSibling);
    
    this.resetButton(button);
  }

  private insertReplyIntoComment(post: LinkedInPost, reply: string): void {
    const commentInput = post.element.querySelector('textarea, [contenteditable="true"]') as HTMLElement;
    
    if (commentInput) {
      if (commentInput.tagName === 'TEXTAREA') {
        (commentInput as HTMLTextAreaElement).value = reply;
        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        commentInput.textContent = reply;
        commentInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      commentInput.focus();
    }
  }

  private resetButton(button: HTMLButtonElement): void {
    button.textContent = 'Generate Reply';
    button.disabled = false;
  }
}

// Initialize ReplyMate when page loads
new LinkedInReplyMate();
