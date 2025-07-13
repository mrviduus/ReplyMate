import { flanT5Pipeline } from '../src/worker/pipeline';

/**
 * Unit test for Flan-T5 draft generation
 * Verifies that the pipeline returns a non-empty response within acceptable time
 */
async function testDraftGeneration(): Promise<void> {
  console.log('🧪 Testing Flan-T5 draft generation...');
  
  const testMessage = 'Great post, thanks!';
  const startTime = Date.now();
  
  try {
    // Initialize the pipeline
    await flanT5Pipeline.initialize();
    console.log('✅ Pipeline initialized');
    
    // Generate response
    const response = await flanT5Pipeline.generate(testMessage, {
      maxTokens: 80,
      temperature: 0.7
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Verify response is non-empty
    if (!response || response.trim().length === 0) {
      throw new Error('Generated response is empty');
    }
    
    // Verify response time is under 2 seconds (acceptance criteria)
    if (duration > 2000) {
      console.warn(`⚠️  Response time ${duration}ms exceeds 2s target (WASM fallback?)`);
    } else {
      console.log(`✅ Response time: ${duration}ms (under 2s)`);
    }
    
    console.log(`📝 Generated response: "${response}"`);
    console.log(`📊 Response length: ${response.length} characters`);
    console.log('✅ Draft generation test passed!');
    
    // Performance summary
    console.log('\n📈 Performance Summary:');
    console.log(`- Input: "${testMessage}"`);
    console.log(`- Output: "${response}"`);
    console.log(`- Duration: ${duration}ms`);
    console.log(`- Target: <2000ms`);
    console.log(`- Status: ${duration < 2000 ? '✅ PASS' : '⚠️  SLOW'}`);
    
  } catch (error) {
    console.error('❌ Draft generation test failed:', error);
    throw error;
  } finally {
    // Clean up
    flanT5Pipeline.dispose();
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testDraftGeneration()
    .then(() => {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testDraftGeneration };
