# Testing the LinkedIn Auto-Reply Extension

## Installation Steps

1. **Open Chrome/Edge Extensions Page**
   ```
   chrome://extensions/
   ```
   or
   ```
   edge://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle the "Developer mode" switch in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to and select the `dist` folder:
     ```
     /Users/vasylvdovychenko/projects/ONNX/auto-reply/dist
     ```

4. **Verify Installation**
   - You should see "LinkedIn Auto-Reply Assistant" in your extensions list
   - The extension icon should appear in the browser toolbar

## Testing the Extension

### 1. Basic Functionality Test
1. Click the extension icon to open the popup
2. Verify the settings interface loads
3. Check that model status is displayed
4. Try clicking "Settings" to open the options page

### 2. LinkedIn Integration Test
1. Navigate to [LinkedIn Messages](https://www.linkedin.com/messaging/)
2. Open any conversation
3. Click in the message compose area
4. Look for the auto-reply suggestion panel (may take a moment to appear)

### 3. Settings Configuration Test
1. Open the options page (click "Settings" in popup)
2. Navigate through different sections:
   - General Settings
   - AI Models
   - Templates
   - Privacy
   - Analytics
3. Try enabling/disabling features
4. Test template creation

## Troubleshooting

### Extension Won't Load
- **Check the console**: Press F12 → Console tab for errors
- **Verify file structure**: Ensure all files are in the `dist` folder
- **Check permissions**: Make sure Chrome can access the folder

### LinkedIn Integration Issues
- **Refresh LinkedIn page**: The extension needs to inject scripts
- **Check permissions**: Ensure the extension has access to LinkedIn
- **Console errors**: Check for JavaScript errors in browser console

### Model Loading Issues
- **Large files**: AI models are several GB and take time to download
- **Memory**: Ensure sufficient browser memory (close other tabs if needed)
- **Network**: Models download from Hugging Face servers

## Expected Behavior

### First Use
1. Extension popup shows "Models not loaded"
2. Click "Load Models" (this takes several minutes)
3. Models download and cache locally
4. Status changes to "Models ready"

### LinkedIn Usage
1. Navigate to LinkedIn messages
2. Click on a conversation
3. Start typing in the message box
4. Auto-reply suggestions appear in a floating panel
5. Click a suggestion to use it

### Privacy Note
- All AI processing happens locally in your browser
- No data is sent to external servers
- Models are cached locally for performance

## Debug Mode

To enable detailed logging:
1. Open browser console (F12)
2. Run: `localStorage.setItem('linkedin-autoreply-debug', 'true')`
3. Reload LinkedIn page
4. Check console for detailed logs

## Performance Notes

- **Memory Usage**: Large language models require significant RAM
- **Initial Load**: First model loading takes several minutes
- **Response Generation**: 1-5 seconds per response depending on model size
- **Browser Performance**: May slow down with multiple models loaded

---

**Status**: Extension is ready for testing! 🚀

All build issues have been resolved:
- ✅ CSS files are now properly generated and included
- ✅ PNG icons are available for Chrome compatibility
- ✅ Manifest.json is valid and properly references assets
- ✅ All TypeScript compilation errors fixed
- ✅ Webpack build completes successfully
