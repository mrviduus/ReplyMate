// success-background.ts - Service worker for auto-popup functionality (TypeScript version)

console.log('Background service worker loaded');

// Extension installation event handler
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails): void => {
  console.log('Extension installed:', details.reason);
  showSuccessPopup();
});

// Chrome startup event handler
chrome.runtime.onStartup.addListener((): void => {
  console.log('Chrome started');
  // Uncomment next line if you want popup on every Chrome startup
  // showSuccessPopup();
});

// Message listener for success redirect
chrome.runtime.onMessage.addListener((msg, _sender) => {
  if (msg?.type === 'SUCCESS_REDIRECT') {
    // Analytics
    console.log('success_redirect');
    // Open LinkedIn in new tab
    chrome.tabs.create({ url: 'https://www.linkedin.com/' });
  }
});

// Function to show success popup
async function showSuccessPopup(): Promise<void> {
  try {
    // Create a new tab/window with the success popup
    const popup = await chrome.windows.create({
      url: chrome.runtime.getURL('success-popup.html'),
      type: 'popup',
      width: 400,
      height: 300,
      focused: true
    });
    
    console.log('Success popup window created:', popup.id);
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
    console.log('Could not create success popup:', errorMessage);
  }
}
