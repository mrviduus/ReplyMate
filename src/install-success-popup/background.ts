// background.ts - Service worker for auto-popup functionality (TypeScript version)

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

// Function to show success popup
async function showSuccessPopup(): Promise<void> {
  try {
    // Try to open popup automatically
    if (chrome.action && chrome.action.openPopup) {
      await chrome.action.openPopup();
      console.log('Success popup opened automatically');
    } else {
      console.log('Auto-popup not supported - popup will show when user clicks extension');
    }
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
    console.log('Could not auto-open popup:', errorMessage);
  }
}
