/**
 * Toast Notification Utility
 * Shows temporary notification messages to the user
 */

export interface ToastOptions {
  /** Toast message text */
  message: string;
  /** Toast type for styling */
  type?: 'info' | 'warning' | 'error' | 'success';
  /** Duration in milliseconds (default: 3000) */
  duration?: number;
  /** Optional action button */
  action?: {
    label: string;
    callback: () => void;
  };
}

/**
 * Shows a toast notification on the page
 * @param options Toast configuration options
 */
export function showToast(options: ToastOptions | string): void {
  const config: ToastOptions = typeof options === 'string' 
    ? { message: options, type: 'info', duration: 3000 }
    : { type: 'info', duration: 3000, ...options };

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `ai-extension-toast ai-extension-toast--${config.type}`;
  
  // Create message element
  const messageElement = document.createElement('span');
  messageElement.textContent = config.message;
  toast.appendChild(messageElement);
  
  // Add action button if provided
  if (config.action) {
    const actionButton = document.createElement('button');
    actionButton.textContent = config.action.label;
    actionButton.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.3);
      color: inherit;
      border-radius: 4px;
      padding: 4px 8px;
      margin-left: 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
    `;
    
    actionButton.addEventListener('click', () => {
      config.action!.callback();
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    });
    
    toast.appendChild(actionButton);
  }

  // Apply styles
  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: getToastColor(config.type!),
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: '10000',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s ease',
    maxWidth: '300px',
    wordWrap: 'break-word',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  });

  // Add to page
  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Remove after duration
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, config.duration);
}

/**
 * Gets the background color for a toast type
 */
function getToastColor(type: string): string {
  switch (type) {
    case 'success': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'error': return '#EF4444';
    case 'info':
    default: return '#3B82F6';
  }
}
