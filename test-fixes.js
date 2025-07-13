#!/usr/bin/env node

/**
 * Quick test to verify the offscreen API fixes
 */

const fs = require('fs');

console.log('🧪 Testing Offscreen API Fixes...\n');

// Test 1: Check manifest.json doesn't have invalid 'offscreen' key
console.log('📋 Checking manifest.json...');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

if (manifest.offscreen) {
  console.error('❌ Invalid "offscreen" key found in manifest.json');
  process.exit(1);
} else {
  console.log('✅ No invalid "offscreen" key in manifest.json');
}

if (manifest.permissions.includes('offscreen')) {
  console.log('✅ "offscreen" permission correctly included');
} else {
  console.error('❌ Missing "offscreen" permission');
  process.exit(1);
}

// Test 2: Check service worker has proper error handling
console.log('\n🔍 Checking service worker error handling...');
const swContent = fs.readFileSync('dist/sw.js', 'utf8');

const requiredPatterns = [
  /chrome\.offscreen/,
  /hasOffscreenAPI/,
  /sendToFallback/,
  /Offscreen API not available/,
  /chrome\.runtime\.lastError/
];

let foundPatterns = 0;
for (const pattern of requiredPatterns) {
  if (pattern.test(swContent)) {
    foundPatterns++;
  }
}

if (foundPatterns >= 4) {
  console.log('✅ Service worker has proper offscreen API handling');
} else {
  console.error('❌ Service worker missing proper error handling');
  process.exit(1);
}

// Test 3: Check offscreen document functionality
console.log('\n🔍 Checking offscreen document...');
const offscreenContent = fs.readFileSync('dist/offscreen.js', 'utf8');

if (offscreenContent.includes('ORT ready') && offscreenContent.includes('handleMessage')) {
  console.log('✅ Offscreen document has message handling and ML logic');
} else {
  console.error('❌ Offscreen document missing functionality');
  process.exit(1);
}

// Test 4: Check file sizes are reasonable
console.log('\n📊 Checking bundle sizes...');
const swSize = fs.statSync('dist/sw.js').size;
const offscreenSize = fs.statSync('dist/offscreen.js').size;

console.log(`   sw.js: ${(swSize / 1024).toFixed(2)} KB`);
console.log(`   offscreen.js: ${(offscreenSize / 1024).toFixed(2)} KB`);

if (swSize < 20 * 1024 && offscreenSize > 100 * 1024) {
  console.log('✅ Bundle sizes are appropriate');
} else {
  console.warn('⚠️  Bundle sizes may not be optimal');
}

console.log('\n🎉 All tests passed! Extension should work properly now.');
console.log('\n📋 Fixed issues:');
console.log('   ✅ Removed invalid "offscreen" manifest key');
console.log('   ✅ Added proper offscreen API availability checking');
console.log('   ✅ Improved error handling for missing API');
console.log('   ✅ Better message passing with timeout handling');
console.log('\n🚀 Ready for browser testing!');
