#!/bin/bash

echo "🎉 Testing Install Success Popup Component"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: Run this script from the install-success-popup/ directory"
    exit 1
fi

echo "✅ Running from install-success-popup directory"

# Check for TypeScript source files
echo ""
echo "🔍 Checking TypeScript source files..."

if [ -f "popup.ts" ]; then
    echo "✅ popup.ts found"
else
    echo "❌ popup.ts missing"
    exit 1
fi

if [ -f "background.ts" ]; then
    echo "✅ background.ts found"
else
    echo "❌ background.ts missing"
    exit 1
fi

# Check for dist folder
echo ""
echo "🔍 Checking dist folder..."

if [ -d "dist" ]; then
    echo "✅ dist/ folder exists"
else
    echo "❌ dist/ folder missing - run 'npm run build'"
    exit 1
fi

# Check for compiled JavaScript files in dist
echo ""
echo "🔍 Checking compiled JavaScript files in dist/..."

if [ -f "dist/popup.js" ]; then
    echo "✅ dist/popup.js compiled"
else
    echo "❌ dist/popup.js missing - run 'npm run build'"
    exit 1
fi

if [ -f "dist/background.js" ]; then
    echo "✅ dist/background.js compiled"
else
    echo "❌ dist/background.js missing - run 'npm run build'"
    exit 1
fi

# Check required assets in dist
echo ""
echo "🔍 Checking required assets in dist/..."

required_files=("manifest.json" "popup.html" "popup.css" "icon.png")
for file in "${required_files[@]}"; do
    if [ -f "dist/$file" ]; then
        echo "✅ dist/$file copied"
    else
        echo "❌ dist/$file missing"
        exit 1
    fi
done

# Check TypeScript configuration
echo ""
echo "🔍 Checking TypeScript configuration..."

if [ -f "tsconfig.json" ]; then
    echo "✅ tsconfig.json found"
else
    echo "❌ tsconfig.json missing"
    exit 1
fi

if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json missing"
    exit 1
fi

# Validate dist/manifest references compiled files
echo ""
echo "🔍 Validating dist/manifest.json..."

if grep -q '"service_worker": "background.js"' dist/manifest.json; then
    echo "✅ dist/manifest.json references background.js"
else
    echo "❌ dist/manifest.json should reference background.js"
    exit 1
fi

# Validate dist/popup.html references compiled files
echo ""
echo "🔍 Validating dist/popup.html..."

if grep -q 'src="popup.js"' dist/popup.html; then
    echo "✅ dist/popup.html references popup.js"
else
    echo "❌ dist/popup.html should reference popup.js"
    exit 1
fi

echo ""
echo "🎉 Install Success Popup Component is ready!"
echo ""
echo "📁 Component structure:"
echo "install-success-popup/"
echo "├── popup.ts          # Auto-dismiss popup logic"
echo "├── background.ts     # Installation detection"
echo "├── popup.html        # Success message UI"
echo "├── popup.css         # Success styling"
echo "├── manifest.json     # Extension configuration"
echo "├── package.json      # Build configuration"
echo "├── tsconfig.json     # TypeScript configuration"
echo "└── dist/             # Built component (load this in Chrome)"
echo "    ├── popup.js      # Compiled popup logic"
echo "    ├── background.js # Compiled background script"
echo "    ├── popup.html    # Success message UI"
echo "    ├── popup.css     # Success styling"
echo "    ├── manifest.json # Extension configuration"
echo "    └── icon.png      # Extension icon"
echo ""
echo "🔧 Development commands:"
echo "• npm run build  - Build component to dist/ folder"
echo "• npm run watch  - Auto-compile TypeScript on changes"
echo "• npm run clean  - Remove dist/ folder"
echo "• npm run dev    - Build and start watch mode"
echo ""
echo "🚀 Test in Chrome: chrome://extensions/ → Load unpacked → select install-success-popup/dist/ folder"
echo ""
echo "✨ Expected behavior:"
echo "1. 📦 Extension installs and popup appears automatically"
echo "2. ✅ Shows 'Extension uploaded successfully' message"
echo "3. ⏰ Displays 5-second countdown timer"
echo "4. 🔒 Automatically closes when countdown reaches zero"
echo ""
echo "🎯 Install Success Popup Component ready for testing!"
