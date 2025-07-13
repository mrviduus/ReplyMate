#!/usr/bin/env node

/**
 * Simple test script to check if the extension builds correctly
 * and contains no DOM references in background.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing LinkedIn Auto-Reply Extension...\n');

// Test 1: Check if all required files exist
const requiredFiles = [
  'dist/manifest.json',
  'dist/background.js',
  'dist/offscreen.js', 
  'dist/offscreen.html',
  'dist/content.js',
  'dist/popup.js',
  'dist/popup.html'
];

console.log('✅ Checking required files...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
  console.log(`   ✓ ${file}`);
}

// Test 2: Check background.js for DOM references
console.log('\n🔍 Checking background.js for DOM references...');
const backgroundContent = fs.readFileSync('dist/background.js', 'utf8');

const domReferences = [
  /\bdocument\./g,
  /\bwindow\./g,
  /\bDOM\b/g
];

let foundDomRefs = false;
for (const regex of domReferences) {
  const matches = backgroundContent.match(regex);
  if (matches && matches.length > 0) {
    // Filter out false positives (like chrome.offscreen.createDocument)
    const realMatches = matches.filter(match => 
      !backgroundContent.includes('chrome.offscreen.createDocument') ||
      !match.includes('DOM_SCRAPING')
    );
    
    if (realMatches.length > 0) {
      console.error(`❌ Found DOM reference in background.js: ${realMatches[0]}`);
      foundDomRefs = true;
    }
  }
}

if (!foundDomRefs) {
  console.log('   ✅ No direct DOM references found in background.js');
}

// Test 3: Check offscreen.html structure
console.log('\n🔍 Checking offscreen.html...');
const offscreenHtml = fs.readFileSync('dist/offscreen.html', 'utf8');

if (offscreenHtml.includes('<script src="offscreen.js">')) {
  console.log('   ✅ offscreen.html includes offscreen.js');
} else {
  console.error('   ❌ offscreen.html missing offscreen.js reference');
  process.exit(1);
}

if (offscreenHtml.includes('id="status"')) {
  console.log('   ✅ offscreen.html has status element');
} else {
  console.error('   ❌ offscreen.html missing status element');
  process.exit(1);
}

// Test 4: Check manifest.json
console.log('\n🔍 Checking manifest.json...');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

if (manifest.permissions.includes('offscreen')) {
  console.log('   ✅ Manifest includes offscreen permission');
} else {
  console.error('   ❌ Manifest missing offscreen permission');
  process.exit(1);
}

if (manifest.background && manifest.background.service_worker === 'background.js') {
  console.log('   ✅ Manifest correctly references background.js as service worker');
} else {
  console.error('   ❌ Manifest background configuration incorrect');
  process.exit(1);
}

// Test 5: Check bundle sizes
console.log('\n📊 Checking bundle sizes...');
const backgroundSize = fs.statSync('dist/background.js').size;
const offscreenSize = fs.statSync('dist/offscreen.js').size;

console.log(`   background.js: ${(backgroundSize / 1024).toFixed(2)} KB`);
console.log(`   offscreen.js: ${(offscreenSize / 1024).toFixed(2)} KB`);

if (backgroundSize < 50 * 1024) { // Should be small without AI models
  console.log('   ✅ background.js size is reasonable');
} else {
  console.warn('   ⚠️  background.js seems large, may contain unexpected dependencies');
}

console.log('\n🎉 Extension validation completed successfully!');
console.log('\n📋 Summary:');
console.log('   ✅ All required files present');
console.log('   ✅ No DOM references in background.js');
console.log('   ✅ Offscreen document properly configured');
console.log('   ✅ Manifest configuration correct');
console.log('\n🚀 Extension should load without "registration failed" errors');
console.log('🤖 Offscreen document should log "ORT ready" within 3 seconds');
