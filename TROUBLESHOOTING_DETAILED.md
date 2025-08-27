# ReplyMate Troubleshooting Guide

## Issue: "Generation takes forever" or "Extension not responding"

### 🔍 Symptoms
- Reply generation button appears but nothing happens
- Long loading times (several minutes)
- Console errors about "Extension context invalidated"
- LinkedIn page becomes unresponsive

### 🚀 Quick Fixes (Try in order)

#### 1. **Refresh LinkedIn Page** ⚡
- Press `Ctrl+F5` (Windows) or `Cmd+R` (Mac) to hard refresh
- This clears any cached extension context issues

#### 2. **Reload Extension** 🔄
- Go to `chrome://extensions/`
- Find "ReplyMate" and click the reload button (🔄)
- Refresh LinkedIn page after reloading

#### 3. **Check AI Model Loading** 🤖
- Click the ReplyMate extension icon in the toolbar
- Check if the popup shows "Loading initial model..."
- **First-time loading can take 2-5 minutes** depending on internet speed
- Subsequent loads should be faster (cached models)

#### 4. **Memory Check** 💾
- Press `F12` to open Developer Tools
- Go to Console tab
- Paste and run the diagnostic script below:

```javascript
// Run this diagnostic in LinkedIn console
if (performance.memory) {
  const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
  console.log(`Memory usage: ${memoryMB}MB`);
  if (memoryMB > 1000) console.warn('High memory usage detected');
}
chrome.runtime.sendMessage({action: 'checkEngineStatus'}, (r) => {
  console.log('Engine status:', r);
  if (chrome.runtime.lastError) console.error('Extension error:', chrome.runtime.lastError);
});
```

### 🛠️ Advanced Solutions

#### 5. **Clear Extension Data**
- Go to `chrome://extensions/`
- Click "Details" on ReplyMate
- Scroll down and click "Extension options" (if available)
- Or clear browser data for the extension

#### 6. **Restart Chrome**
- Close all Chrome windows
- Restart Chrome completely
- Extensions sometimes need a fresh browser session

#### 7. **Check Available RAM**
- ReplyMate uses AI models that require significant memory
- **Minimum recommended**: 4GB available RAM
- Close other tabs/applications if needed

### 🔧 Model Selection Tips

#### For Slower Devices:
- Open ReplyMate popup
- Select a "Fastest" model from the dropdown
- Smaller models load faster and use less memory

#### For Better Quality:
- Once any model loads successfully, you can switch to larger models
- "Recommended" models provide the best balance
- "Best Quality" models require more resources

### 📊 Expected Loading Times

| Model Size | First Load | Subsequent Loads |
|------------|------------|------------------|
| Fastest (0.5B) | 30-60 seconds | 5-10 seconds |
| Recommended (1B) | 1-2 minutes | 10-15 seconds |
| Best Quality (3B) | 2-5 minutes | 15-30 seconds |

### 🚨 When to Report Issues

Report bugs if:
- Extension fails after trying all above steps
- Error persists across multiple Chrome restarts
- Generation fails with specific error messages

Include:
- Chrome version
- Operating system
- Available RAM
- Console error messages (F12 → Console)

### 💡 Pro Tips

1. **First-time users**: Let the extension load completely once, then it's much faster
2. **Multiple tabs**: Only use ReplyMate on one LinkedIn tab at a time
3. **Background loading**: You can browse other sites while the model loads
4. **Model switching**: Start with fastest model, upgrade once working

### 🔄 Version 0.2.6 Improvements

- Better error handling and user feedback
- Faster fallback to smaller models if needed
- Improved timeout handling (30-second max wait)
- Better extension context management
- More descriptive error messages

---

**Still having issues?** Create an issue on GitHub with your console logs and system specs.
