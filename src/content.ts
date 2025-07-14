/**
 * Content Script for ReplyMate Extension
 * Handles DOM interaction and LinkedIn comment detection/insertion
 */

import { initializeCommentInserter } from './content/inserter';

// Only the content script is able to access the DOM
chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener(function (msg) {
    port.postMessage({ contents: document.body.innerText });
  });
});

// Initialize AI comment insertion for LinkedIn
if (window.location.hostname.includes('linkedin.com')) {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeCommentInserter, 1000);
    });
  } else {
    setTimeout(initializeCommentInserter, 1000);
  }
}
