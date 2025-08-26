# 🔧 ReplyMate Custom Prompts Troubleshooting Guide

## 🧪 How to Debug Custom Prompts Issue

### Step 1: Check Browser Developer Tools

1. **Open ReplyMate popup**
2. **Right-click → Inspect** (to open DevTools for popup)
3. **Go to Settings tab**
4. **Look for console messages**:
   - `🔄 POPUP: Loading prompts from storage...`
   - `📦 POPUP: Received response:` (should show your saved prompts)
   - `✅ POPUP: Using CUSTOM/DEFAULT prompts`

### Step 2: Test Saving Prompts

1. **Modify a prompt** (add "TESTING123" at the beginning)
2. **Click Save Changes**
3. **Check console for**:
   - `🎛️ POPUP: Attempting to save prompts:`
   - `💾 savePrompts - Saving prompts:`
   - `✅ savePrompts - Successfully saved to storage`
   - `🔍 savePrompts - Verification read:`

### Step 3: Check Background Script Console

1. **Go to** `chrome://extensions/`
2. **Find ReplyMate → Details → background page**
3. **Click "Inspect" for background page**
4. **Go to LinkedIn and generate a reply**
5. **Look for messages**:
   - `🔍 getUserPrompt called for type: standard`
   - `✅ Using prompt type: CUSTOM` (should say CUSTOM if your prompts are saved)
   - `📝 Selected prompt preview:` (should show your custom prompt)

## 🔍 Common Issues & Solutions

### Issue 1: Prompts Not Saving
**Symptoms**: Success message appears but console shows storage errors
**Solution**: Check Chrome storage quotas and permissions

### Issue 2: Prompts Saving But Not Loading
**Symptoms**: Save works but getUserPrompt shows DEFAULT
**Solution**: Check for mismatched storage keys

### Issue 3: Prompts Loading But Not Applied
**Symptoms**: Console shows CUSTOM but AI uses default responses
**Solution**: Clear extension and reload

## 🧪 Manual Storage Test

Run this in the background script console:

```javascript
// Test storage directly
chrome.storage.sync.set({ 
  customPrompts: { 
    standard: "CUSTOM TEST PROMPT", 
    withComments: "CUSTOM COMMENTS TEST" 
  } 
}, () => {
  console.log("Test save complete");
  
  chrome.storage.sync.get(['customPrompts'], (result) => {
    console.log("Test read result:", result);
  });
});
```

## 🎯 What to Look For

### ✅ Success Indicators:
- Console shows "Using CUSTOM prompt"
- Prompt preview shows your custom text
- Generated replies reflect your custom style

### ❌ Failure Indicators:
- Console shows "Using DEFAULT prompt"
- Generated replies are generic
- Storage verification shows empty objects

## 🚀 Quick Fix Steps

1. **Clear Extension Data**:
   - Go to `chrome://extensions/`
   - Remove ReplyMate
   - Reinstall the extension

2. **Reset Storage**:
   ```javascript
   chrome.storage.sync.clear(() => console.log("Storage cleared"));
   ```

3. **Test with Extreme Custom Prompt**:
   - Set prompt to: "Respond like a pirate in 1 sentence"
   - If it works, you'll see pirate language immediately

## 📞 Debug Contact

If none of these work, share the console output from both:
1. Popup DevTools Console (during save)
2. Background Script Console (during reply generation)

This will show exactly where the flow is breaking!
