import { LinkedInMessage, UIState } from '../shared/types';
import { MESSAGE_TYPES, LINKEDIN_SELECTORS, UI_CLASSES } from '../shared/constants';
import { Logger, waitForElement, debounce, sendMessageToBackground } from '../shared/utils';
import './content.css';

class LinkedInContentScript {
  private logger = new Logger('ContentScript');
  private isActive = false;
  private uiState: UIState = {
    isVisible: false,
    currentMessage: null,
    suggestedResponses: [],
    isGenerating: false,
    error: null
  };
  private autoReplyContainer: HTMLElement | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.logger.info('LinkedIn content script initializing...');

    // Check if we're on LinkedIn messaging page
    if (!this.isLinkedInMessaging()) {
      this.logger.info('Not on LinkedIn messaging page, exiting');
      return;
    }

    // Wait for LinkedIn to load
    await this.waitForLinkedInToLoad();

    // Set up observers and event listeners
    this.setupMessageObserver();
    this.setupUIInjection();
    this.setupKeyboardShortcuts();

    // Check extension settings
    await this.checkExtensionStatus();

    this.logger.info('LinkedIn content script initialized');
  }

  private isLinkedInMessaging(): boolean {
    return window.location.href.includes('linkedin.com/messaging');
  }

  private async waitForLinkedInToLoad(): Promise<void> {
    // Wait for the main messaging container to load
    const container = await waitForElement(LINKEDIN_SELECTORS.MESSAGING_CONTAINER, 15000);
    if (!container) {
      throw new Error('LinkedIn messaging interface not found');
    }
    this.logger.info('LinkedIn messaging interface loaded');
  }

  private setupMessageObserver(): void {
    // Watch for new messages in conversations
    const observer = new MutationObserver(debounce(async (mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          await this.checkForNewMessages(mutation.addedNodes);
        }
      }
    }, 500));

    // Observe the message thread container
    const messageContainer = document.querySelector(LINKEDIN_SELECTORS.MESSAGE_THREAD);
    if (messageContainer) {
      observer.observe(messageContainer, {
        childList: true,
        subtree: true
      });
      this.logger.info('Message observer set up');
    }
  }

  private async checkForNewMessages(addedNodes: NodeList): Promise<void> {
    for (const node of addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Check if this is a new message
        const messageContent = element.querySelector(LINKEDIN_SELECTORS.MESSAGE_CONTENT);
        if (messageContent && this.isIncomingMessage(element)) {
          await this.handleNewMessage(element);
        }
      }
    }
  }

  private isIncomingMessage(messageElement: Element): boolean {
    // LinkedIn adds specific classes to distinguish incoming vs outgoing messages
    // This is a simplified check - you may need to adjust based on LinkedIn's current structure
    return !messageElement.classList.contains('msg-s-event-listitem--other-user');
  }

  private async handleNewMessage(messageElement: Element): Promise<void> {
    try {
      const message = this.extractMessageData(messageElement);
      if (!message) return;

      this.logger.info('New incoming message detected:', message.content.substring(0, 50) + '...');

      this.uiState.currentMessage = message;
      await this.generateResponseSuggestions(message);

    } catch (error) {
      this.logger.error('Error handling new message:', error);
      this.uiState.error = 'Failed to process message';
    }
  }

  private extractMessageData(messageElement: Element): LinkedInMessage | null {
    try {
      const contentElement = messageElement.querySelector(LINKEDIN_SELECTORS.MESSAGE_CONTENT);
      if (!contentElement) return null;

      const content = contentElement.textContent?.trim() || '';
      if (!content) return null;

      return {
        id: `msg_${Date.now()}`,
        content,
        sender: this.getCurrentConversationParticipant(),
        timestamp: new Date(),
        conversationId: this.getCurrentConversationId(),
        isIncoming: true
      };
    } catch (error) {
      this.logger.error('Error extracting message data:', error);
      return null;
    }
  }

  private getCurrentConversationParticipant(): string {
    const nameElement = document.querySelector(LINKEDIN_SELECTORS.PARTICIPANT_NAME);
    return nameElement?.textContent?.trim() || 'Unknown';
  }

  private getCurrentConversationId(): string {
    // Extract conversation ID from URL or generate one
    const match = window.location.href.match(/\/messaging\/thread\/([^\/]+)/);
    return match ? match[1] : `conv_${Date.now()}`;
  }

  private async generateResponseSuggestions(message: LinkedInMessage): Promise<void> {
    if (!this.isActive) return;

    try {
      this.uiState.isGenerating = true;
      this.uiState.error = null;
      this.updateUI();

      // Get conversation context
      const context = this.getConversationContext();

      // Request response generation from background
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.GENERATE_RESPONSE,
        payload: {
          message: message.content,
          context,
          conversationId: message.conversationId
        }
      });

      if (response.success && response.data) {
        this.uiState.suggestedResponses = response.data.responses;
        this.logger.info(`Generated ${response.data.responses.length} response suggestions`);
      } else {
        throw new Error(response.error || 'Failed to generate responses');
      }

    } catch (error) {
      this.logger.error('Error generating responses:', error);
      this.uiState.error = 'Failed to generate responses';
    } finally {
      this.uiState.isGenerating = false;
      this.updateUI();
    }
  }

  private getConversationContext(): string[] {
    // Extract recent messages from the conversation
    const messageElements = document.querySelectorAll(LINKEDIN_SELECTORS.MESSAGE_CONTENT);
    const context: string[] = [];

    // Get last 5 messages for context
    const recentMessages = Array.from(messageElements).slice(-5);
    for (const element of recentMessages) {
      const text = element.textContent?.trim();
      if (text) {
        context.push(text);
      }
    }

    return context;
  }

  private setupUIInjection(): void {
    // Find the message input area and inject our UI
    const messageInput = document.querySelector(LINKEDIN_SELECTORS.MESSAGE_INPUT);
    if (messageInput) {
      this.injectAutoReplyUI(messageInput.parentElement!);
    }
  }

  private injectAutoReplyUI(container: Element): void {
    if (this.autoReplyContainer) return; // Already injected

    this.autoReplyContainer = document.createElement('div');
    this.autoReplyContainer.className = UI_CLASSES.CONTAINER;
    this.autoReplyContainer.innerHTML = this.createUIHTML();

    // Inject after the message input
    container.appendChild(this.autoReplyContainer);

    // Set up event listeners
    this.setupUIEventListeners();

    this.logger.info('Auto-reply UI injected');
  }

  private createUIHTML(): string {
    return `
      <div class="${UI_CLASSES.PANEL}" style="display: none;">
        <div class="autoreply-header">
          <h4>AI Response Suggestions</h4>
          <button class="autoreply-close" data-action="close">×</button>
        </div>
        <div class="autoreply-content">
          <div class="autoreply-loading" style="display: none;">
            <div class="spinner"></div>
            <span>Generating responses...</span>
          </div>
          <div class="autoreply-error" style="display: none;"></div>
          <div class="autoreply-suggestions"></div>
        </div>
        <div class="autoreply-actions">
          <button class="autoreply-btn-secondary" data-action="refresh">Regenerate</button>
          <button class="autoreply-btn-primary" data-action="customize">Customize</button>
        </div>
      </div>
      <button class="${UI_CLASSES.BUTTON}" data-action="toggle" title="AI Auto-Reply Assistant">
        🤖 AI
      </button>
    `;
  }

  private setupUIEventListeners(): void {
    if (!this.autoReplyContainer) return;

    this.autoReplyContainer.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const action = target.getAttribute('data-action');

      switch (action) {
        case 'toggle':
          this.toggleUI();
          break;
        case 'close':
          this.hideUI();
          break;
        case 'refresh':
          if (this.uiState.currentMessage) {
            this.generateResponseSuggestions(this.uiState.currentMessage);
          }
          break;
        case 'use-response':
          const responseText = target.getAttribute('data-response');
          if (responseText) {
            this.useResponse(responseText);
          }
          break;
      }
    });
  }

  private toggleUI(): void {
    this.uiState.isVisible = !this.uiState.isVisible;
    this.updateUI();
  }

  private hideUI(): void {
    this.uiState.isVisible = false;
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.autoReplyContainer) return;

    const panel = this.autoReplyContainer.querySelector(`.${UI_CLASSES.PANEL}`) as HTMLElement;
    const loadingEl = panel?.querySelector('.autoreply-loading') as HTMLElement;
    const errorEl = panel?.querySelector('.autoreply-error') as HTMLElement;
    const suggestionsEl = panel?.querySelector('.autoreply-suggestions') as HTMLElement;

    if (!panel) return;

    // Show/hide panel
    panel.style.display = this.uiState.isVisible ? 'block' : 'none';

    if (!this.uiState.isVisible) return;

    // Update loading state
    if (loadingEl) {
      loadingEl.style.display = this.uiState.isGenerating ? 'block' : 'none';
    }

    // Update error state
    if (errorEl) {
      errorEl.style.display = this.uiState.error ? 'block' : 'none';
      errorEl.textContent = this.uiState.error || '';
    }

    // Update suggestions
    if (suggestionsEl) {
      suggestionsEl.innerHTML = this.uiState.suggestedResponses
        .map((response) => `
          <div class="${UI_CLASSES.SUGGESTION}">
            <p>${response}</p>
            <button class="use-response-btn" data-action="use-response" data-response="${response}">
              Use This Response
            </button>
          </div>
        `).join('');
    }
  }

  private useResponse(responseText: string): void {
    try {
      const messageInput = document.querySelector(LINKEDIN_SELECTORS.MESSAGE_INPUT) as HTMLElement;
      if (!messageInput) {
        throw new Error('Message input not found');
      }

      // Set the response text in the message input
      messageInput.focus();
      messageInput.innerText = responseText;

      // Trigger input event to notify LinkedIn
      const event = new Event('input', { bubbles: true });
      messageInput.dispatchEvent(event);

      this.hideUI();
      this.logger.info('Response inserted into message input');

    } catch (error) {
      this.logger.error('Error using response:', error);
      this.uiState.error = 'Failed to insert response';
      this.updateUI();
    }
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + Shift + A to toggle AI assistant
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        this.toggleUI();
      }
    });
  }

  private async checkExtensionStatus(): Promise<void> {
    try {
      const response = await sendMessageToBackground({
        type: MESSAGE_TYPES.GET_SETTINGS
      });

      if (response.success && response.data) {
        this.isActive = response.data.isEnabled;
        this.logger.info(`Extension is ${this.isActive ? 'enabled' : 'disabled'}`);
      }
    } catch (error) {
      this.logger.error('Failed to check extension status:', error);
    }
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new LinkedInContentScript();
  });
} else {
  new LinkedInContentScript();
}
