// success-background.ts - Service worker for auto-popup functionality (TypeScript version)

console.log('Background service worker loaded');

// Extension installation event handler
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails): void => {
  console.log('Extension installed:', details.reason);
  // Mark extension as used since we're showing the success popup
  chrome.storage.local.set({ hasUsedExtension: true });
  showSuccessPopup();
});

// Chrome startup event handler
chrome.runtime.onStartup.addListener((): void => {
  console.log('Chrome started');
  // Uncomment next line if you want popup on every Chrome startup
  // showSuccessPopup();
});

// Message listener for success redirect and LinkedIn reply generation
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.type === 'SUCCESS_REDIRECT') {
    // Analytics
    console.log('success_redirect');
    // Open LinkedIn in new tab
    chrome.tabs.create({ url: 'https://www.linkedin.com/' });
    return;
  }
  
  if (request.action === 'generateLinkedInReply') {
    // Forward the request to the popup for AI processing
    // since service workers have limitations with AI libraries
    handleLinkedInReplyRequest(request, sendResponse);
    return true; // Keep channel open for async response
  }
});

// Handle LinkedIn reply requests by delegating to popup
async function handleLinkedInReplyRequest(request: any, sendResponse: (response: any) => void): Promise<void> {
  try {
    // Try to communicate with the popup if it's open
    const tabs = await chrome.tabs.query({});
    
    // For now, provide a simple fallback response
    // The actual AI processing will be handled by the popup when it's open
    const fallbackReplies = [
      "Thank you for sharing this insightful post! I'd love to hear more about your thoughts on this topic.",
      "Great perspective! This really resonates with my experience in the field.",
      "Interesting points! I appreciate you sharing your expertise on this subject.",
      "Thanks for the valuable insights! This gives me a lot to think about.",
      "Excellent post! I completely agree with your analysis."
    ];
    
    // Select a random fallback reply
    const randomReply = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    
    // Add a small delay to simulate processing
    setTimeout(() => {
      sendResponse({ 
        reply: randomReply,
        note: "This is a fallback reply. For AI-powered responses, please open the ReplyMate popup and ensure the AI model is loaded."
      });
    }, 1000);
    
  } catch (error) {
    console.error('Error handling LinkedIn reply request:', error);
    sendResponse({ 
      error: 'Failed to generate reply',
      fallbackReply: "Thank you for sharing this insightful post!"
    });
  }
}

// Function to show success notification (console log only)
async function showSuccessPopup(): Promise<void> {
  try {
    console.log('ReplyMate Extension: Successfully loaded and ready to use on LinkedIn');
    // Optional: Could show a browser notification instead
    // chrome.notifications.create({
    //   type: 'basic',
    //   iconUrl: 'icons/icon-64.png',
    //   title: 'ReplyMate Extension',
    //   message: 'Successfully loaded and ready to use!'
    // });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
    console.log('ReplyMate Extension ready, with minor setup note:', errorMessage);
  }
}
