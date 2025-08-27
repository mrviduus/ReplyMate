#!/usr/bin/env node

// Quick test to validate model selection logic
const { prebuiltAppConfig } = require('@mlc-ai/web-llm');

// Simulate the model selection logic from popup.ts
const MODEL_PROFILES = {
  'professional': {
    models: ['Llama-3.2-3B-Instruct-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'gemma-2-2b-it-q4f16_1-MLC'],
    description: 'Best quality for professional communication'
  },
  'balanced': {
    models: ['Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC', 'gemma-2-2b-it-q4f16_1-MLC'],
    description: 'Balanced speed and quality'
  },
  'fast': {
    models: ['Qwen2.5-0.5B-Instruct-q4f16_1-MLC', 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC', 'Qwen2-0.5B-Instruct-q4f16_1-MLC'],
    description: 'Fastest responses for low-end devices'
  }
};

function getOptimalModel() {
  try {
    // Get available models from the current model list
    const availableModelIds = prebuiltAppConfig.model_list.map(m => m.model_id);
    
    console.log('📋 Available models:', availableModelIds.length);
    console.log('🔍 Available models:');
    availableModelIds.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
    
    // Check which recommended models are available
    console.log('\n🎯 Recommended models availability:');
    Object.entries(MODEL_PROFILES).forEach(([profile, config]) => {
      console.log(`\n${profile.toUpperCase()} (${config.description}):`);
      config.models.forEach(modelId => {
        const available = availableModelIds.includes(modelId);
        console.log(`  ${available ? '✅' : '❌'} ${modelId}`);
      });
    });
    
    // Simulate device-based selection (default to balanced)
    let targetProfile = 'balanced';
    
    // Find the first available model from the target profile
    for (const modelId of MODEL_PROFILES[targetProfile].models) {
      if (availableModelIds.includes(modelId)) {
        console.log(`\n🤖 Selected optimal model: ${modelId} (${MODEL_PROFILES[targetProfile].description})`);
        return modelId;
      }
    }
    
    // Fallback logic
    const fallback = availableModelIds.find(id => id.includes('Llama-3.2-1B')) || 
                    availableModelIds.find(id => id.includes('Llama')) ||
                    availableModelIds[0];
    
    console.log(`\n🔄 Using fallback model: ${fallback}`);
    return fallback;
  } catch (error) {
    console.error('❌ Error in model selection:', error.message);
    return "Llama-3.2-1B-Instruct-q4f16_1-MLC";
  }
}

console.log('🚀 Testing ReplyMate Model Selection\n');
const selectedModel = getOptimalModel();
console.log(`\n✅ Final selection: ${selectedModel}`);
