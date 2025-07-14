#!/bin/bash

# Auto-Dismiss Success Popup - Validation Test
echo "✨ Auto-Dismiss Success Popup - Validation Test"
echo "==============================================="

# Check if we're in the right directory
if [ ! -f "build/manifest.json" ]; then
    echo "❌ Error: build/manifest.json not found."
    exit 1
fi

echo "✅ Found build directory"

# Validate required files
echo ""
echo "🔍 Validating extension files..."

required_files=("manifest.json" "popup.html" "popup.js" "background.js" "README.md")
for file in "${required_files[@]}"; do
    if [ -f "build/$file" ]; then
        echo "✅ build/$file"
    else
        echo "❌ Missing: build/$file"
        exit 1
    fi
done

# Validate JSON
echo ""
echo "🔍 Validating manifest.json..."
if python3 -m json.tool build/manifest.json > /dev/null 2>&1; then
    echo "✅ manifest.json is valid JSON"
else
    echo "❌ manifest.json is invalid JSON"
    exit 1
fi

echo ""
echo "🎉 Auto-Dismiss Success Popup is ready for testing!"
echo ""
echo "📋 Expected Behavior After Loading:"
echo "1. ✅ Popup shows automatically with 'Extension uploaded successfully.'"
echo "2. ✅ NO Start Registry button present"
echo "3. ✅ Popup displays '5 seconds' auto-close message"
echo "4. ✅ Popup closes automatically after exactly 5 seconds"
echo "5. ✅ No console errors"
echo ""
echo "🧪 Test Steps:"
echo "1. Load unpacked extension from build/ directory"
echo "2. Verify popup appears automatically with success message"
echo "3. Confirm no Start Registry button is present"
echo "4. Wait exactly 5 seconds"
echo "5. Verify popup closes automatically"
echo "6. Check browser console shows auto-close logs"
echo ""
echo "🚀 Load in Chrome: chrome://extensions/ → Developer mode → Load unpacked → build/"
echo ""
echo "✨ Ready for auto-dismiss testing!"
