// ReplyMate Extension Diagnostic Script
// Run this in the browser console on LinkedIn to check extension status

console.log('🔍 ReplyMate Extension Diagnostic');
console.log('================================');

// Check if extension is loaded
const replyButtons = document.querySelectorAll('.replymate-generate-btn');
console.log(`✓ Reply buttons found: ${replyButtons.length}`);

// Check extension context
try {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('✓ Chrome extension API available');
    
    // Test message passing
    chrome.runtime.sendMessage({action: 'checkEngineStatus'}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('❌ Extension context error:', chrome.runtime.lastError);
        console.log('💡 Solution: Reload the extension in chrome://extensions');
      } else {
        console.log('✓ Extension communication working');
        console.log('Engine status:', response);
      }
    });
  } else {
    console.error('❌ Chrome extension API not available');
  }
} catch (error) {
  console.error('❌ Extension context error:', error);
}

// Check for LinkedIn posts
const posts = document.querySelectorAll('[data-id*="urn:li:activity"], .feed-shared-update-v2');
console.log(`✓ LinkedIn posts found: ${posts.length}`);

// Check for action containers
const actionContainers = document.querySelectorAll('.feed-shared-social-actions, .social-details-social-activity');
console.log(`✓ Action containers found: ${actionContainers.length}`);

// Memory check
if (performance.memory) {
  const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
  const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024);
  console.log(`💾 Memory usage: ${memoryMB}MB / ${limitMB}MB`);
  
  if (memoryMB > limitMB * 0.8) {
    console.warn('⚠️ High memory usage detected - may cause issues');
  }
}

console.log('================================');
console.log('🚀 If you see errors above, try:');
console.log('1. Refresh this page');
console.log('2. Reload extension in chrome://extensions');
console.log('3. Check for extension updates');
