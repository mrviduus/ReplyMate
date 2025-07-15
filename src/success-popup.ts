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
  autoCloseDelay: 3000, // 3 seconds
  initialTime: 3
};

// State management
let timeLeft: number = config.initialTime;

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', (): void => {
  console.log('Auto-dismiss timer started - closing in 3 seconds');
  
  const countdownElement: HTMLElement | null = document.querySelector('.countdown');

  // Countdown timer function
  const countdown = setInterval((): void => {
    timeLeft--;
    
    if (countdownElement) {
      if (timeLeft > 0) {
        const secondText: string = timeLeft !== 1 ? 's' : '';
        countdownElement.textContent = `Closing in ${timeLeft} second${secondText}...`;
      } else {
        countdownElement.textContent = 'Closing now...';
        clearInterval(countdown);
      }
    }
  }, 1000);

  // Auto-close function with redirect
  const autoClosePopup = (): void => {
    console.log('Auto-closing popup after 3 seconds');
    chrome.runtime.sendMessage({ type: 'SUCCESS_REDIRECT' });
    window.close();
  };

  // Set auto-close timer
  setTimeout(autoClosePopup, config.autoCloseDelay);
});
