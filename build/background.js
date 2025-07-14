// background.js - Service worker for auto-popup functionality

console.log('Background service worker loaded');

// Show popup when extension is installed
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
    showSuccessPopup();
});

// Show popup when Chrome starts (if needed)
chrome.runtime.onStartup.addListener(() => {
    console.log('Chrome started');
    // Uncomment next line if you want popup on every Chrome startup
    // showSuccessPopup();
});

async function showSuccessPopup() {
    try {
        // Try to open popup automatically
        if (chrome.action && chrome.action.openPopup) {
            await chrome.action.openPopup();
            console.log('Success popup opened automatically');
        } else {
            console.log('Auto-popup not supported - popup will show when user clicks extension');
        }
    } catch (error) {
        console.log('Could not auto-open popup:', error.message);
    }
}
