#!/usr/bin/env node
const { promises: fs } = require('fs');
const path = require('path');

/**
 * Fetches and prepares the Flan-T5-Small model for the extension
 * Downloads int8 quantized ONNX model from Hugging Face
 */
async function fetchModel() {
  const modelId = 'Xenova/flan-t5-small';
  const modelsDir = path.join(__dirname, '../assets/models');
  const modelDir = path.join(modelsDir, 'flan-t5-small');
  
  console.log('🔄 Preparing to fetch Flan-T5-Small model...');
  
  try {
    // Create models directory if it doesn't exist
    await fs.mkdir(modelDir, { recursive: true });
    
    // Create model manifest
    const manifest = {
      name: 'flan-t5-small',
      id: 'Xenova/flan-t5-small',
      type: 'text2text-generation',
      quantization: 'int8',
      description: 'Flan-T5-Small quantized to int8 for efficient inference',
      size: '~60MB',
      capabilities: [
        'text-generation',
        'conversation',
        'summarization',
        'question-answering'
      ],
      webAccess: true,
      cacheLocation: 'models/flan-t5-small/onnx/int8'
    };
    
    await fs.writeFile(
      path.join(modelDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    // Create placeholder for model weights (will be downloaded by browser)
    const readmePath = path.join(modelDir, 'README.md');
    const readmeContent = `# Flan-T5-Small Model

This directory contains the Flan-T5-Small model configuration.

## Model Details
- **Model ID**: ${modelId}
- **Quantization**: int8 ONNX
- **Size**: ~60MB
- **Type**: Text-to-Text Generation

## Loading
The actual model weights are downloaded and cached automatically by the browser
when first used. This ensures optimal loading and caching performance.

## Usage
The model is automatically loaded by the AI service when needed for:
- LinkedIn message response generation
- Context-aware conversation assistance
- Professional tone adaptation
`;

    await fs.writeFile(readmePath, readmeContent);
    
    console.log('✅ Model configuration created successfully');
    console.log(`📁 Model directory: ${modelDir}`);
    console.log('🔄 Model weights will be downloaded automatically on first use');
    console.log(`💾 Current disk usage: <1MB (weights downloaded on demand)`);
    
  } catch (error) {
    console.error('❌ Failed to prepare model:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fetchModel();
}

module.exports = { fetchModel };
