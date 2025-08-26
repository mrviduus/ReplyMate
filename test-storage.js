// Test script to verify Chrome storage functionality
// Run this in the browser console (extension context)

console.log('🧪 Testing Chrome Storage Functionality...');

// Test 1: Basic storage write/read
const testPrompts = {
  standard: 'TEST STANDARD PROMPT - This is a custom test prompt',
  withComments: 'TEST COMMENTS PROMPT - This is a custom comments prompt'
};

console.log('📝 Testing storage write...');
chrome.storage.sync.set({ customPrompts: testPrompts }, () => {
  console.log('✅ Write completed, testing read...');
  
  chrome.storage.sync.get(['customPrompts'], (result) => {
    console.log('📖 Storage read result:', result);
    
    if (result.customPrompts) {
      console.log('✅ Storage working correctly!');
      console.log('📊 Stored prompts:', result.customPrompts);
    } else {
      console.log('❌ Storage read failed - no customPrompts found');
    }
  });
});

// Test 2: Simulate the getUserPrompt function
setTimeout(() => {
  console.log('🔍 Testing getUserPrompt simulation...');
  
  chrome.storage.sync.get(['customPrompts'], (result) => {
    const customPrompts = result.customPrompts || {};
    const standardPrompt = customPrompts.standard || 'DEFAULT_STANDARD';
    const commentsPrompt = customPrompts.withComments || 'DEFAULT_COMMENTS';
    
    console.log('🎯 Standard prompt:', standardPrompt);
    console.log('🎯 Comments prompt:', commentsPrompt);
    
    if (standardPrompt.includes('TEST STANDARD')) {
      console.log('✅ Custom standard prompt found!');
    } else {
      console.log('❌ Custom standard prompt NOT found - using default');
    }
    
    if (commentsPrompt.includes('TEST COMMENTS')) {
      console.log('✅ Custom comments prompt found!');
    } else {
      console.log('❌ Custom comments prompt NOT found - using default');
    }
  });
}, 1000);

// Test 3: Clear storage for cleanup
setTimeout(() => {
  console.log('🧹 Cleaning up test data...');
  chrome.storage.sync.remove('customPrompts', () => {
    console.log('✅ Test cleanup completed');
  });
}, 2000);
