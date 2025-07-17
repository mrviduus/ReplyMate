# Testing ReplyMate Extension

## Installation Instructions

1. Open Chrome browser
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the `dist` folder: `/Users/vasylvdovychenko/projects/ReplyMate/beta-04/ReplyMate/dist`

## Testing AI Reply Generation on LinkedIn

### Background Service Worker Test
1. After installation, go to `chrome://extensions/` 
2. Click "service worker" link next to ReplyMate extension
3. In the DevTools console, you should see initialization messages
4. Wait for "Background engine ready" message (may take 1-2 minutes on first load)

### LinkedIn Integration Test
1. Go to LinkedIn.com and log in
2. Navigate to your feed or any post
3. Look for "Reply" buttons next to existing LinkedIn action buttons
4. Click a "Reply" button
5. **Expected behavior:**
   - Button should show loading state
   - If AI is still initializing, you'll see a toast message: "AI model is loading..."
   - Once ready, an AI-generated professional reply should appear in a panel
   - The reply should be relevant to the post content

### Troubleshooting

**If Reply button doesn't appear:**
- Check browser console for errors
- Ensure you're on a LinkedIn post page
- Refresh the page

**If AI generation fails:**
- Check the service worker console (`chrome://extensions/` > service worker)
- Look for WebLLM initialization errors
- The AI model download is ~4GB and happens on first use

**If getting fallback replies only:**
- Wait for background initialization to complete
- Check service worker console for "Background engine ready" message
- Try clicking the Reply button again after initialization

### Testing Chat Functionality

1. Click the ReplyMate extension icon in the toolbar
2. The popup should show chat interface
3. Wait for model loading to complete
4. Type a message and press Enter
5. Should receive AI-generated response

## Key Features Implemented

✅ **LinkedIn Reply Generation**: AI-powered professional replies directly on LinkedIn posts
✅ **Background AI Service**: Persistent AI that works without popup being open  
✅ **Native UI Integration**: Reply buttons styled to match LinkedIn's design
✅ **Status Feedback**: Loading states and error messages for better UX
✅ **Fallback Handling**: Graceful degradation when AI is initializing
✅ **Chat Interface**: Full conversational AI in extension popup

## Architecture Overview

- **Background Service Worker**: Handles AI engine initialization and LinkedIn reply generation
- **Content Script**: Injects Reply buttons and handles LinkedIn DOM manipulation  
- **Popup**: Provides chat interface with independent AI engine
- **Persistent AI**: Background service stays alive using Chrome alarms API

The extension now properly separates AI functionality between background (for LinkedIn) and popup (for chat), ensuring LinkedIn replies work reliably without requiring the popup to be open.
