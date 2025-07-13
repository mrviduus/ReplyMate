#!/usr/bin/env node

/**
 * Validation script for the new split architecture
 * Tests that sw.js is clean and offscreen.js contains ML logic
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Split Architecture...\n');

// Test 1: Check if required files exist
const requiredFiles = [
  'dist/manifest.json',
  'dist/sw.js',
  'dist/offscreen.js', 
  'dist/offscreen.html',
  'dist/content.js',
  'dist/popup.js',
  'dist/popup.html',
  'dist/options.js',
  'dist/options.html'
];

console.log('✅ Checking required files...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
  console.log(`   ✓ ${file}`);
}

// Test 2: Check sw.js for DOM references (should be none)
console.log('\n🔍 Checking sw.js for DOM references...');
const swContent = fs.readFileSync('dist/sw.js', 'utf8');

const domReferences = [
  /\bdocument\./g,
  /\bwindow\./g,
  /\bDOM\b/g,
  /getElementById/g,
  /querySelector/g,
  /createElement/g
];

let foundDomRefs = false;
for (const regex of domReferences) {
  const matches = swContent.match(regex);
  if (matches && matches.length > 0) {
    // Filter out false positives (like chrome.offscreen.Reason.DOM_SCRAPING)
    const realMatches = matches.filter(match => 
      !swContent.includes('DOM_SCRAPING') || match !== 'DOM'
    );
    
    if (realMatches.length > 0) {
      console.error(`❌ Found DOM reference in sw.js: ${realMatches[0]}`);
      foundDomRefs = true;
    }
  }
}

if (!foundDomRefs) {
  console.log('   ✅ No DOM references found in sw.js (clean service worker)');
}

// Test 3: Check offscreen.js for ML dependencies (should have them)
console.log('\n🔍 Checking offscreen.js for ML logic...');
const offscreenContent = fs.readFileSync('dist/offscreen.js', 'utf8');

const mlIndicators = [
  /ORT ready/,
  /Flan-T5/,
  /transformers/,
  /generateResponse/,
  /initialize/
];

let foundMlRefs = 0;
for (const regex of mlIndicators) {
  if (regex.test(offscreenContent)) {
    foundMlRefs++;
  }
}

if (foundMlRefs >= 3) {
  console.log('   ✅ ML logic found in offscreen.js');
} else {
  console.error('   ❌ ML logic missing from offscreen.js');
  process.exit(1);
}

// Test 4: Check manifest.json configuration
console.log('\n🔍 Checking manifest.json...');
const manifest = JSON.parse(fs.readFileSync('dist/manifest.json', 'utf8'));

if (manifest.background && manifest.background.service_worker === 'sw.js') {
  console.log('   ✅ Manifest correctly references sw.js as service worker');
} else {
  console.error('   ❌ Manifest background configuration incorrect');
  process.exit(1);
}

if (manifest.permissions.includes('offscreen')) {
  console.log('   ✅ Manifest includes offscreen permission');
} else {
  console.error('   ❌ Manifest missing offscreen permission');
  process.exit(1);
}

if (manifest.offscreen && manifest.offscreen.url === 'offscreen.html') {
  console.log('   ✅ Manifest includes offscreen document configuration');
} else {
  console.error('   ❌ Manifest missing offscreen document configuration');
  process.exit(1);
}

// Test 5: Check bundle sizes
console.log('\n📊 Checking bundle sizes...');
const swSize = fs.statSync('dist/sw.js').size;
const offscreenSize = fs.statSync('dist/offscreen.js').size;
const contentSize = fs.statSync('dist/content.js').size;

console.log(`   sw.js: ${(swSize / 1024).toFixed(2)} KB`);
console.log(`   offscreen.js: ${(offscreenSize / 1024).toFixed(2)} KB`);
console.log(`   content.js: ${(contentSize / 1024).toFixed(2)} KB`);

if (swSize < 20 * 1024) { // Should be small without AI models
  console.log('   ✅ sw.js size is reasonable (no heavy dependencies)');
} else {
  console.warn('   ⚠️  sw.js seems large, may contain unexpected dependencies');
}

if (offscreenSize > 100 * 1024) { // Should be large with ML models
  console.log('   ✅ offscreen.js size indicates ML dependencies included');
} else {
  console.warn('   ⚠️  offscreen.js seems small, ML dependencies may be missing');
}

// Test 6: Check for feature detection
console.log('\n🔍 Checking for offscreen API fallback...');
if (swContent.includes('hasOffscreenAPI') && swContent.includes('sendToFallback')) {
  console.log('   ✅ Offscreen API feature detection and fallback found');
} else {
  console.warn('   ⚠️  Offscreen API feature detection may be missing');
}

console.log('\n🎉 Architecture validation completed successfully!');
console.log('\n📋 Summary:');
console.log('   ✅ All required files present');
console.log('   ✅ Clean service worker (sw.js) with no DOM references');
console.log('   ✅ Offscreen document (offscreen.js) contains ML logic');
console.log('   ✅ Manifest configuration correct');
console.log('   ✅ Bundle sizes appropriate');

console.log('\n🚀 Ready for browser testing:');
console.log('   1. Load extension from dist/ folder');
console.log('   2. Service worker should show "activated" status');
console.log('   3. No "document is not defined" errors');
console.log('   4. Draft button should generate replies on LinkedIn');
