/**
 * Enhanced Test script to verify custom prompts functionality
 * Run this in the browser console on any LinkedIn page after installing the extension
 */

console.log('🧪 Starting Enhanced Custom Prompts Test...');

// Enhanced Test 1: Check extension communication
async function testExtensionConnection() {
  console.log('\n� Test 1: Extension Connection Check');
  
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
    console.error('❌ Chrome extension API not available');
    return false;
  }
  
  console.log('✅ Extension ID:', chrome.runtime.id);
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      { action: 'checkEngineStatus' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error('❌ Extension communication failed:', chrome.runtime.lastError);
          resolve(false);
        } else {
          console.log('✅ Extension responding:', response);
          resolve(true);
        }
      }
    );
  });
}

// Enhanced Test 2: Save obvious test prompts
async function saveTestPrompts() {
  console.log('\n💾 Test 2: Saving Obvious Test Custom Prompts');
  
  const testPrompts = {
    standard: 'DEBUG CUSTOM STANDARD: Always start your reply with "CUSTOM PROMPT WORKING:" followed by your response.',
    withComments: 'DEBUG CUSTOM COMMENTS: Always begin with "CUSTOM COMMENTS WORKING:" then provide your analysis.'
  };
  
  console.log('Saving prompts:', testPrompts);
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      { action: 'savePrompts', prompts: testPrompts },
      (response) => {
        console.log('💾 Save Response:', response);
        if (response?.success) {
          console.log('✅ Test prompts saved successfully!');
          resolve(true);
        } else {
          console.log('❌ Failed to save test prompts:', response?.error);
          resolve(false);
        }
      }
    );
  });
}

// Enhanced Test 3: Verify with new debug action
async function debugPrompts() {
  console.log('\n🔍 Test 3: Debug Prompts Check');
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      { action: 'debugPrompts' },
      (response) => {
        console.log('🔍 Debug Response:', response);
        
        if (response?.isCustomStandard) {
          console.log('✅ Custom standard prompt is ACTIVE!');
          console.log('📝 Preview:', response.activeStandard);
        } else {
          console.log('⚠️ Using default standard prompt');
        }
        
        if (response?.isCustomWithComments) {
          console.log('✅ Custom comments prompt is ACTIVE!');
          console.log('📝 Preview:', response.activeWithComments);
        } else {
          console.log('⚠️ Using default comments prompt');
        }
        
        resolve(response);
      }
    );
  });
}

// Enhanced Test 4: Test actual reply generation
async function testReplyGeneration() {
  console.log('\n🎯 Test 4: Testing Reply Generation with Enhanced Logging');
  
  const testPost = "This is a test post about AI and technology innovation in 2025.";
  
  console.log('📤 Sending generation request for:', testPost);
  console.log('👀 Watch the background console for detailed logs starting with 🔵 and 🟢');
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      { 
        action: 'generateLinkedInReply',
        postContent: testPost
      },
      (response) => {
        console.log('\n� Generated Reply Response:', response);
        
        if (response?.reply) {
          console.log('📄 Reply Content:', response.reply);
          
          if (response.reply.includes('CUSTOM PROMPT WORKING')) {
            console.log('🎉🎉🎉 SUCCESS! Custom prompts are working perfectly!');
          } else {
            console.log('⚠️ Custom prompt might not be applied - check background console');
          }
        } else {
          console.log('❌ No reply generated:', response?.error);
        }
        
        resolve(response);
      }
    );
  });
}

// Enhanced Test 5: Test comments-based generation
async function testCommentsGeneration() {
  console.log('\n🎯 Test 5: Testing Comments-Based Reply Generation');
  
  const testPost = "What are your thoughts on the future of AI?";
  const testComments = [
    { text: "I think AI will revolutionize healthcare", likeCount: 25 },
    { text: "The potential is huge but we need ethical guidelines", likeCount: 15 }
  ];
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      { 
        action: 'generateLinkedInReplyWithComments',
        postContent: testPost,
        topComments: testComments
      },
      (response) => {
        console.log('\n📝 Comments-Based Reply:', response);
        
        if (response?.reply?.includes('CUSTOM COMMENTS WORKING')) {
          console.log('🎉 Comments custom prompt working!');
        } else {
          console.log('⚠️ Comments custom prompt might not be applied');
        }
        
        resolve(response);
      }
    );
  });
}

// Run comprehensive test suite
async function runComprehensiveTest() {
  try {
    console.log('🚀 Running Comprehensive Custom Prompts Test Suite...\n');
    
    // Test 1: Check connection
    const connected = await testExtensionConnection();
    if (!connected) {
      console.error('❌ Cannot proceed - extension not responding');
      return;
    }
    
    // Test 2: Save test prompts
    const saved = await saveTestPrompts();
    if (!saved) {
      console.error('❌ Cannot proceed - failed to save test prompts');
      return;
    }
    
    // Wait for storage sync
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Debug check
    await debugPrompts();
    
    // Test 4: Standard reply generation
    await testReplyGeneration();
    
    // Test 5: Comments reply generation
    await testCommentsGeneration();
    
    console.log('\n🏁 Test suite completed!');
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Open chrome://extensions/ → ReplyMate → "background page"');
    console.log('2. Look for logs starting with 🔵 and 🟢');
    console.log('3. Try clicking a real Reply button on LinkedIn');
    console.log('4. Check if replies start with "CUSTOM PROMPT WORKING:"');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Auto-run the comprehensive test
runComprehensiveTest();

// Expose functions for manual testing
window.testCustomPrompts = {
  connection: testExtensionConnection,
  save: saveTestPrompts,
  debug: debugPrompts,
  generate: testReplyGeneration,
  comments: testCommentsGeneration,
  runAll: runComprehensiveTest
};

console.log('\n💡 Manual testing functions available:');
console.log('window.testCustomPrompts.connection() - Test extension connection');
console.log('window.testCustomPrompts.debug() - Check current prompt status');
console.log('window.testCustomPrompts.generate() - Test reply generation');
console.log('window.testCustomPrompts.runAll() - Run full test suite');
