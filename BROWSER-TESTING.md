# Browser Testing Instructions

## Loading the Extension

1. **Open Chrome/Edge** and navigate to `chrome://extensions/` (or `edge://extensions/`)

2. **Enable Developer Mode** (toggle in top-right corner)

3. **Click "Load unpacked"** and select the `dist/` folder

4. **Check for errors** in the Extensions page - should show:
   - ✅ Extension loaded successfully
   - ✅ No "registration failed" errors
   - ✅ No "service worker registration failed" messages

## Testing Offscreen Document Initialization

1. **Open Developer Tools** (F12)

2. **Go to Console tab**

3. **Navigate to any LinkedIn page** (e.g., https://linkedin.com)

4. **Watch for offscreen document initialization**:
   - Should see offscreen.html being created
   - Should log "ORT ready" within 3 seconds
   - May see model loading progress

## Alternative Direct Testing

1. **Right-click on extension icon** → "Inspect popup"

2. **In DevTools Console**, run:
   ```javascript
   chrome.runtime.sendMessage({type: 'ping'}, response => {
     console.log('Background response:', response);
   });
   ```

3. **Test model loading**:
   ```javascript
   chrome.runtime.sendMessage({
     type: 'load_model', 
     payload: {modelId: 'flan-t5-small'}
   }, response => {
     console.log('Model load response:', response);
   });
   ```

## Expected Results

### ✅ Success Indicators:
- Extension appears in extensions list without errors
- Console shows "Background service initializing..."
- Offscreen document logs "🚀 Starting AI service initialization..."
- Within 3 seconds: "✅ ORT ready - AI models initialized"
- No "registration failed" or DOM-related errors

### ❌ Failure Indicators:
- "Service worker registration failed" 
- "Uncaught ReferenceError: document is not defined"
- Extension shows as "Inactive" or grayed out
- Console errors about missing APIs

## Troubleshooting

If you see errors:

1. **Check Console** for specific error messages
2. **Verify manifest.json** is valid JSON
3. **Ensure all files** are in dist/ folder  
4. **Try reloading** the extension (gear icon → reload)
5. **Check model files** exist in `dist/models/flan-t5-small/`

## Performance Verification

The extension should:
- Load quickly (background.js is only 6.53 KB)
- Initialize AI models within 3 seconds
- Respond to message commands promptly
- Not block the browser UI during initialization
