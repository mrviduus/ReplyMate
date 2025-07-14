// popup.ts - Auto-dismiss functionality with countdown (TypeScript version)

console.log('Auto-dismiss popup initialized');

// Type definitions
interface CountdownConfig {
  autoCloseDelay: number;
  initialTime: number;
}

// Configuration
const config: CountdownConfig = {
  autoCloseDelay: 5000, // 5 seconds
  initialTime: 5
};

// State management
let timeLeft: number = config.initialTime;
const countdownElement: HTMLElement | null = document.querySelector('.countdown');

// Countdown timer function
const countdown: number = setInterval((): void => {
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

// Auto-close function
const autoClosePopup = (): void => {
  console.log('Auto-closing popup after 5 seconds');
  window.close();
};

// Set auto-close timer
setTimeout(autoClosePopup, config.autoCloseDelay);

console.log('Auto-dismiss timer started - closing in 5 seconds');
