#!/usr/bin/env node

/**
 * Build script for LinkedIn Auto-Reply Extension
 * Creates dual outputs: clean service worker (sw.js) and offscreen document
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  console.log('🔨 Building LinkedIn Auto-Reply Extension...\n');

  const isProduction = process.argv.includes('--production');
  const isWatch = process.argv.includes('--watch');

  const commonConfig = {
    bundle: true,
    minify: isProduction,
    sourcemap: !isProduction,
    target: ['chrome109', 'edge109'],
    format: 'esm',
    platform: 'browser',
    resolveExtensions: ['.ts', '.js'],
    loader: {
      '.wasm': 'file',
      '.onnx': 'file'
    },
    define: {
      'process.env.NODE_ENV': isProduction ? '"production"' : '"development"'
    }
  };

  try {
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist', { recursive: true });
    }

    // Build 1: Clean Service Worker (no DOM dependencies)
    console.log('📦 Building service worker (sw.js)...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/background/index.ts'],
      outfile: 'dist/sw.js',
      external: ['@huggingface/transformers'], // Exclude heavy ML dependencies
      banner: {
        js: '// LinkedIn Auto-Reply Extension - Service Worker\n// No DOM dependencies, delegates AI to offscreen document\n'
      }
    });
    console.log('✅ Service worker built successfully');

    // Build 2: Offscreen Document (includes all ML dependencies)
    console.log('📦 Building offscreen document...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/offscreen/main.ts'],
      outfile: 'dist/offscreen.js',
      banner: {
        js: '// LinkedIn Auto-Reply Extension - Offscreen Document\n// Contains all ML/AI processing logic\n'
      }
    });
    console.log('✅ Offscreen document built successfully');

    // Build 3: Content Script
    console.log('📦 Building content script...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/content/content.ts'],
      outfile: 'dist/content.js',
      external: ['@huggingface/transformers']
    });
    console.log('✅ Content script built successfully');

    // Build 4: Popup
    console.log('📦 Building popup...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/popup/popup.ts'],
      outfile: 'dist/popup.js',
      external: ['@huggingface/transformers']
    });
    console.log('✅ Popup built successfully');

    // Build 5: Options page
    console.log('📦 Building options page...');
    await esbuild.build({
      ...commonConfig,
      entryPoints: ['src/options/options.ts'],
      outfile: 'dist/options.js',
      external: ['@huggingface/transformers']
    });
    console.log('✅ Options page built successfully');

    // Copy static files
    console.log('📋 Copying static files...');
    const staticFiles = [
      { from: 'manifest.json', to: 'dist/manifest.json' },
      { from: 'src/popup/popup.html', to: 'dist/popup.html' },
      { from: 'src/options/options.html', to: 'dist/options.html' },
      { from: 'src/offscreen/offscreen.html', to: 'dist/offscreen.html' },
      { from: 'src/popup/popup.css', to: 'dist/popup.css' },
      { from: 'src/options/options.css', to: 'dist/options.css' },
      { from: 'src/content/content.css', to: 'dist/content.css' }
    ];

    for (const file of staticFiles) {
      if (fs.existsSync(file.from)) {
        const dir = path.dirname(file.to);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.copyFileSync(file.from, file.to);
      }
    }

    // Copy assets
    if (fs.existsSync('assets')) {
      const copyDir = (src, dest) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const items = fs.readdirSync(src);
        for (const item of items) {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      copyDir('assets', 'dist');
    }

    // Copy models directory (local ONNX models)
    if (fs.existsSync('models')) {
      const copyDir = (src, dest) => {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        const items = fs.readdirSync(src);
        for (const item of items) {
          const srcPath = path.join(src, item);
          const destPath = path.join(dest, item);
          if (fs.statSync(srcPath).isDirectory()) {
            copyDir(srcPath, destPath);
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        }
      };
      console.log('📦 Copying local models...');
      copyDir('models', 'dist/models');
      console.log('✅ Models copied successfully');
    }

    console.log('✅ Static files copied successfully');

    // Bundle size analysis
    console.log('\n📊 Bundle Analysis:');
    const files = [
      { name: 'sw.js', desc: 'Service Worker (clean)' },
      { name: 'offscreen.js', desc: 'Offscreen Document (with ML)' },
      { name: 'content.js', desc: 'Content Script' },
      { name: 'popup.js', desc: 'Popup' },
      { name: 'options.js', desc: 'Options Page' }
    ];

    for (const file of files) {
      const filePath = `dist/${file.name}`;
      if (fs.existsSync(filePath)) {
        const size = fs.statSync(filePath).size;
        const sizeKB = Math.round(size / 1024 * 100) / 100;
        console.log(`   ${file.desc}: ${sizeKB} KB`);
      }
    }

    console.log('\n🎉 Build completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Load extension from dist/ folder in Chrome/Edge');
    console.log('   2. Check that service worker status shows "activated"');
    console.log('   3. Visit LinkedIn and test draft generation');

    // Watch mode
    if (isWatch) {
      console.log('\n👀 Watching for changes...');
      // Note: This is a simplified watch implementation
      // In production, you might want to use a more sophisticated file watcher
    }

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run the build
build().catch(console.error);
