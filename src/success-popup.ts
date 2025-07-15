// success-popup.ts - Auto-close functionality (TypeScript version)

import "./success-popup.css";

console.log('Auto-close popup initialized');

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
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', (): void => {
  console.log('Auto-close timer started - closing in 7 seconds');
  
  const countdownElement: HTMLElement | null = document.querySelector('.countdown');
  const closeBtn: HTMLButtonElement | null = document.querySelector('#close-btn');
  const redirectBtn: HTMLButtonElement | null = document.querySelector('#redirect-btn');

  // Button event listeners
  closeBtn?.addEventListener('click', (): void => {
    console.log('Close button clicked - closing popup');
    clearTimers();
    window.close();
  });

  redirectBtn?.addEventListener('click', (): void => {
    console.log('Redirect button clicked - redirecting to LinkedIn');
    clearTimers();
    chrome.runtime.sendMessage({ type: 'SUCCESS_REDIRECT' });
    window.close();
  });

  // Function to clear all timers
  const clearTimers = (): void => {
    if (countdownTimer) clearInterval(countdownTimer);
    if (autoCloseTimer) clearTimeout(autoCloseTimer);
  };

  // Listen for beforeunload to detect manual close
  window.addEventListener('beforeunload', (): void => {
    clearTimers();
    console.log('Popup manually closed');
  });

  // Countdown timer function (just counts down, no redirect)
  countdownTimer = setInterval((): void => {
    timeLeft--;
    
    if (countdownElement) {
      if (timeLeft > 0) {
        const secondText: string = timeLeft !== 1 ? 's' : '';
        countdownElement.textContent = `Closing in ${timeLeft} second${secondText}...`;
      } else {
        countdownElement.textContent = 'Closing now...';
        if (countdownTimer) clearInterval(countdownTimer);
      }
    }
  }, 1000);

  // Auto-close function (just closes, no redirect)
  const autoClosePopup = (): void => {
    console.log('Auto-closing popup after 7 seconds - no redirect');
    window.close();
  };

  // Set auto-close timer
  autoCloseTimer = setTimeout(autoClosePopup, config.autoCloseDelay);
});
