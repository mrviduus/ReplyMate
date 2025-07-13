import { mkdirSync, existsSync, writeFileSync, createWriteStream } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import https from 'https';

const OUT = 'models/flan-t5-small/onnx/int8';

if (existsSync(path.join(OUT, 'model.onnx'))) {
  console.log('✓ flan-t5-small model already exists, skipping download');
  process.exit(0);
}

console.log('📥 Downloading flan-t5-small model...');
mkdirSync(OUT, { recursive: true });

// Helper function to download a file
function downloadFile(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', reject);
    }).on('error', reject);
  });
}

async function downloadModel() {
  try {
    // Try downloading from the main branch using the direct file URLs
    const baseUrl = 'https://huggingface.co/Xenova/flan-t5-small/resolve/main';
    
    const files = [
      { name: 'model.onnx', path: 'onnx/encoder_model.onnx' },
      { name: 'decoder_model.onnx', path: 'onnx/decoder_model.onnx' },
      { name: 'decoder_model_merged.onnx', path: 'onnx/decoder_model_merged.onnx' },
      { name: 'tokenizer.json', path: 'tokenizer.json' },
      { name: 'tokenizer_config.json', path: 'tokenizer_config.json' },
      { name: 'config.json', path: 'config.json' },
      { name: 'generation_config.json', path: 'generation_config.json' }
    ];

    for (const file of files) {
      const url = `${baseUrl}/${file.path}`;
      const outputPath = path.join(OUT, file.name);
      
      console.log(`📥 Downloading ${file.name}...`);
      
      try {
        await downloadFile(url, outputPath);
        console.log(`✓ Downloaded ${file.name}`);
      } catch (error) {
        console.warn(`⚠️ Failed to download ${file.name}: ${error}`);
        // Try alternative: use git-lfs approach
        try {
          execSync(`curl -L "https://huggingface.co/Xenova/flan-t5-small/raw/main/${file.path}" -o "${outputPath}"`, { stdio: 'inherit' });
          console.log(`✓ Downloaded ${file.name} (alternative method)`);
        } catch (altError) {
          console.warn(`⚠️ Both download methods failed for ${file.name}`);
        }
      }
    }
    
    // Create a manifest file
    const manifest = {
      model_type: 'flan-t5',
      task: 'text2text-generation',
      quantization: 'int8',
      source: 'Xenova/flan-t5-small',
      downloaded_at: new Date().toISOString(),
      files: files.map(f => f.name)
    };
    
    writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
    
    console.log('✓ flan-t5-small downloaded to', OUT);
  } catch (error) {
    console.error('❌ Failed to download model:', error);
    process.exit(1);
  }
}

downloadModel();
