// popup.js - Auto-dismiss functionality with countdown

console.log('Auto-dismiss popup initialized');

// Auto-close after 5 seconds
const AUTO_CLOSE_DELAY = 5000;

// Update countdown every second
let timeLeft = 5;
const countdownElement = document.querySelector('.countdown');

const countdown = setInterval(() => {
    timeLeft--;
    if (timeLeft > 0) {
        countdownElement.textContent = `Closing in ${timeLeft} second${timeLeft !== 1 ? 's' : ''}...`;
    } else {
        countdownElement.textContent = 'Closing now...';
        clearInterval(countdown);
    }
}, 1000);

// Auto-close the popup
setTimeout(() => {
    console.log('Auto-closing popup after 5 seconds');
    window.close();
}, AUTO_CLOSE_DELAY);

console.log('Auto-dismiss timer started - closing in 5 seconds');
