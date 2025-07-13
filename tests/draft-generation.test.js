const { pipeline } = require('@huggingface/transformers');

/**
 * Simple Node.js test for Flan-T5 draft generation
 * Tests basic functionality and performance in a Node.js environment
 */
async function testDraftGeneration() {
  console.log('🧪 Testing Flan-T5 draft generation...');
  
  const testMessage = 'Great post, thanks!';
  const startTime = Date.now();
  
  try {
    console.log('📦 Loading Flan-T5-Small model...');
    
    // Load the pipeline directly (this will download the model if needed)
    const generator = await pipeline('text2text-generation', 'Xenova/flan-t5-small');
    console.log('✅ Pipeline loaded');
    
    // Generate response
    const prompt = `You are a professional LinkedIn user. Write a brief, professional response to this message: "${testMessage}"

Response:`;
    
    console.log('🔄 Generating response...');
    const result = await generator(prompt, {
      max_new_tokens: 80,
      temperature: 0.7,
      do_sample: true
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const response = result[0]?.generated_text || result[0]?.text || '';
    
    // Verify response is non-empty
    if (!response || response.trim().length === 0) {
      throw new Error('Generated response is empty');
    }
    
    // Clean up the response
    const cleanResponse = response
      .replace(/^(Response:|Reply:|Answer:)\s*/i, '')
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Verify response time
    if (duration > 10000) {  // 10s limit for first load
      console.warn(`⚠️  Response time ${duration}ms exceeds expectations (first load can be slow)`);
    } else {
      console.log(`✅ Response time: ${duration}ms`);
    }
    
    console.log(`📝 Generated response: "${cleanResponse}"`);
    console.log(`📊 Response length: ${cleanResponse.length} characters`);
    console.log('✅ Draft generation test passed!');
    
    // Performance summary
    console.log('\n📈 Performance Summary:');
    console.log(`- Input: "${testMessage}"`);
    console.log(`- Output: "${cleanResponse}"`);
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Status: ✅ WORKING`);
    
    return {
      input: testMessage,
      output: cleanResponse,
      duration,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Draft generation test failed:', error);
    throw error;
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDraftGeneration()
    .then((result) => {
      console.log('\n🎉 Test completed successfully!');
      console.log('Result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testDraftGeneration };
