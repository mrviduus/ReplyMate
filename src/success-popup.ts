// success-popup.ts - Auto-dismiss functionality with countdown (TypeScript version)

import "./success-popup.css";

console.log('Auto-dismiss popup initialized');

// Type definitions
interface CountdownConfig {
  autoCloseDelay: number;
  initialTime: number;
}

// Configuration
const config: CountdownConfig = {
  autoCloseDelay: 7000, // 7 seconds
  initialTime: 7
};

// State management
let timeLeft: number = config.initialTime;
let shouldRedirect: boolean = true; // Flag to control redirect behavior

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', (): void => {
  console.log('Auto-dismiss timer started - closing in 7 seconds');
  
  const countdownElement: HTMLElement | null = document.querySelector('.countdown');
  const redirectMessageElement: HTMLElement | null = document.querySelector('.redirect-message');

  // Listen for beforeunload to detect manual close
  window.addEventListener('beforeunload', (): void => {
    shouldRedirect = false;
    console.log('Popup manually closed - redirect cancelled');
  });

  // Countdown timer function
  const countdown = setInterval((): void => {
    timeLeft--;
    
    if (countdownElement) {
      if (timeLeft > 0) {
        const secondText: string = timeLeft !== 1 ? 's' : '';
        countdownElement.textContent = `Closing in ${timeLeft} second${secondText}...`;
        
        // Update redirect message
        if (redirectMessageElement) {
          const redirectSecondText: string = timeLeft !== 1 ? 's' : '';
          redirectMessageElement.textContent = `You will be redirected to LinkedIn in ${timeLeft} second${redirectSecondText}...`;
        }
      } else {
        countdownElement.textContent = 'Closing now...';
        if (redirectMessageElement) {
          redirectMessageElement.textContent = 'Redirecting to LinkedIn...';
        }
        clearInterval(countdown);
      }
    }
  }, 1000);

  // Auto-close function with redirect
  const autoClosePopup = (): void => {
    if (shouldRedirect) {
      console.log('Auto-closing popup after 7 seconds - redirecting to LinkedIn');
      chrome.runtime.sendMessage({ type: 'SUCCESS_REDIRECT' });
    } else {
      console.log('Auto-close triggered but redirect was cancelled due to manual close');
    }
    window.close();
  };

  // Set auto-close timer
  setTimeout(autoClosePopup, config.autoCloseDelay);
});
