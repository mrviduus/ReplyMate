import { Message, MessageResponse, LogEntry } from './types';
import { MESSAGE_TYPES } from './constants';

/**
 * Send a message to the background script and wait for response
 */
export async function sendMessageToBackground<T = any>(
  message: Message
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    const requestId = generateId();
    const messageWithId = { ...message, requestId };
    
    const responseHandler = (response: MessageResponse<T>) => {
      if (response.requestId === requestId) {
        chrome.runtime.onMessage.removeListener(responseHandler);
        resolve(response);
      }
    };
    
    chrome.runtime.onMessage.addListener(responseHandler);
    chrome.runtime.sendMessage(messageWithId);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(responseHandler);
      resolve({
        success: false,
        error: 'Request timeout',
        requestId
      });
    }, 30000);
  });
}

/**
 * Send a message to content script
 */
export async function sendMessageToContent<T = any>(
  tabId: number,
  message: Message
): Promise<MessageResponse<T>> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response: any) => {
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: chrome.runtime.lastError.message || 'Unknown error'
        });
      } else {
        resolve(response || { success: true });
      }
    });
  });
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Wait for an element to appear in the DOM
 */
export function waitForElement(
  selector: string,
  timeout = 10000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

/**
 * Create a simple logger
 */
export class Logger {
  private component: string;

  constructor(component: string) {
    this.component = component;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      component: this.component,
      message,
      data
    };

    // Log to console with appropriate level
    const consoleMethod = level === 'info' ? 'log' : level;
    console[consoleMethod](`[${this.component}] ${message}`, data || '');

    // Store in background for analytics
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.LOG_USAGE,
      payload: entry
    }).catch(() => {
      // Ignore errors if background script is not available
    });
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }
}

/**
 * Storage utilities with Chrome extension API
 */
export class StorageManager {
  static async get<T>(key: string, defaultValue?: T): Promise<T> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] !== undefined ? result[key] : (defaultValue as T);
    } catch (error) {
      console.error('Storage get error:', error);
      return defaultValue as T;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error('Storage set error:', error);
      throw error;
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error('Storage remove error:', error);
      throw error;
    }
  }

  static async clear(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }
}

/**
 * Text processing utilities
 */
export class TextProcessor {
  /**
   * Clean and normalize text for AI processing
   */
  static cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Extract context from a conversation
   */
  static extractContext(messages: string[], maxLength = 500): string {
    const combined = messages.join(' ');
    if (combined.length <= maxLength) {
      return combined;
    }
    
    // Truncate from the beginning, keeping the most recent context
    return '...' + combined.slice(-(maxLength - 3));
  }

  /**
   * Replace variables in a template
   */
  static fillTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Estimate reading time for text
   */
  static estimateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.ceil(words / wordsPerMinute);
  }
}

/**
 * LinkedIn-specific utilities
 */
export class LinkedInUtils {
  /**
   * Check if current page is LinkedIn messaging
   */
  static isMessagingPage(): boolean {
    return window.location.href.includes('linkedin.com/messaging');
  }

  /**
   * Extract participant information from LinkedIn messaging UI
   */
  static extractParticipantInfo(): { name: string; title?: string } | null {
    const nameElement = document.querySelector('.msg-entity-lockup__entity-title');
    const titleElement = document.querySelector('.msg-entity-lockup__entity-subtitle');
    
    if (!nameElement) return null;
    
    const title = titleElement?.textContent?.trim();
    
    const result: { name: string; title?: string } = {
      name: nameElement.textContent?.trim() || 'Unknown'
    };
    
    if (title) {
      result.title = title;
    }
    
    return result;
  }

  /**
   * Check if there are unread messages
   */
  static hasUnreadMessages(): boolean {
    return document.querySelector('.msg-conversation-card__unread-count') !== null;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static startTimer(name: string): void {
    this.timers.set(name, Date.now());
  }

  static endTimer(name: string): number {
    const startTime = this.timers.get(name);
    if (!startTime) return 0;
    
    const duration = Date.now() - startTime;
    this.timers.delete(name);
    return duration;
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    return fn().finally(() => {
      const duration = this.endTimer(name);
      console.log(`[Performance] ${name}: ${duration}ms`);
    });
  }
}
