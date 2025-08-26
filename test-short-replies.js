/**
 * Test script specifically for verifying SHORT replies (1 sentence only)
 * Run this in LinkedIn console after reloading the extension
 */

console.log('🧪 Testing SHORT Reply Generation...');

// Test function that checks reply length
async function testShortReply() {
  console.log('\n🎯 Testing 1-sentence reply generation...');
  
  const testPost = "AI is transforming how we work in 2025. What's your experience with AI tools in your industry?";
  
  console.log('📤 Sending request for post:', testPost);
  console.log('⏰ This should generate a reply with maximum 25 words...');
  
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      chrome.runtime.id,
      { 
        action: 'generateLinkedInReply',
        postContent: testPost
      },
      (response) => {
        console.log('\n📝 Generated Reply:', response?.reply);
        
        if (response?.reply) {
          const wordCount = response.reply.split(' ').length;
          const sentenceCount = response.reply.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
          
          console.log('📊 Analysis:');
          console.log('  - Word count:', wordCount);
          console.log('  - Sentence count:', sentenceCount);
          console.log('  - Character count:', response.reply.length);
          
          if (wordCount <= 25 && sentenceCount <= 1) {
            console.log('✅✅✅ SUCCESS! Reply is properly short!');
          } else {
            console.log('⚠️ Reply might be too long:');
            if (wordCount > 25) console.log('  - Exceeds 25 word limit');
            if (sentenceCount > 1) console.log('  - Contains multiple sentences');
          }
        } else {
          console.log('❌ No reply generated:', response?.error);
        }
        
        resolve(response);
      }
    );
  });
}

// Test multiple posts to verify consistency
async function testMultiplePosts() {
  const testPosts = [
    "The future of remote work is evolving rapidly.",
    "Data science is becoming crucial for business decisions. How are you leveraging analytics?",
    "Cybersecurity threats are increasing in 2025. What measures is your company taking?",
    "Sustainability initiatives are driving innovation across industries."
  ];
  
  console.log('\n🔄 Testing multiple posts for consistent short replies...');
  
  for (let i = 0; i < testPosts.length; i++) {
    console.log(`\n--- Test ${i + 1} ---`);
    console.log('Post:', testPosts[i]);
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        chrome.runtime.id,
        { action: 'generateLinkedInReply', postContent: testPosts[i] },
        resolve
      );
    });
    
    if (response?.reply) {
      const wordCount = response.reply.split(' ').length;
      console.log(`Reply (${wordCount} words):`, response.reply);
      
      if (wordCount <= 25) {
        console.log('✅ Length OK');
      } else {
        console.log('⚠️ Too long!');
      }
    }
    
    // Wait a moment between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Auto-run the tests
testShortReply();

// Expose for manual testing
window.testShortReplies = {
  single: testShortReply,
  multiple: testMultiplePosts
};

console.log('\n💡 Available commands:');
console.log('window.testShortReplies.single() - Test one reply');
console.log('window.testShortReplies.multiple() - Test multiple posts');
