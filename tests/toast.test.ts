/**
 * Toast Notification Tests
 * Tests the toast notification utility functionality
 */

import { showToast } from '../src/common/toast';

// Mock DOM methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(),
  writable: true
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn()
  },
  writable: true
});

Object.defineProperty(window, 'requestAnimationFrame', {
  value: jest.fn((callback) => setTimeout(callback, 0)),
  writable: true
});

describe('Toast Notifications', () => {
  let mockElement: any;
  let mockAppendChild: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock element
    mockElement = {
      className: '',
      textContent: '',
      style: {},
      parentNode: {
        removeChild: jest.fn()
      }
    };

    // Mock createElement
    (document.createElement as jest.Mock).mockReturnValue(mockElement);
    
    // Mock appendChild
    mockAppendChild = jest.fn();
    (document.body.appendChild as jest.Mock) = mockAppendChild;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('showToast with string message', () => {
    test('should create toast element with message', () => {
      showToast('Test message');

      expect(document.createElement).toHaveBeenCalledWith('div');
      expect(mockElement.textContent).toBe('Test message');
      expect(mockElement.className).toBe('ai-extension-toast ai-extension-toast--info');
    });

    test('should apply default styles', () => {
      showToast('Test message');

      expect(mockElement.style.position).toBe('fixed');
      expect(mockElement.style.top).toBe('20px');
      expect(mockElement.style.right).toBe('20px');
      expect(mockElement.style.backgroundColor).toBe('#3B82F6'); // info color
      expect(mockElement.style.color).toBe('#fff');
      expect(mockElement.style.zIndex).toBe('10000');
    });

    test('should add toast to document body', () => {
      showToast('Test message');

      expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('showToast with options object', () => {
    test('should handle success type', () => {
      showToast({
        message: 'Success!',
        type: 'success'
      });

      expect(mockElement.textContent).toBe('Success!');
      expect(mockElement.className).toBe('ai-extension-toast ai-extension-toast--success');
      expect(mockElement.style.backgroundColor).toBe('#10B981');
    });

    test('should handle warning type', () => {
      showToast({
        message: 'Warning!',
        type: 'warning'
      });

      expect(mockElement.textContent).toBe('Warning!');
      expect(mockElement.className).toBe('ai-extension-toast ai-extension-toast--warning');
      expect(mockElement.style.backgroundColor).toBe('#F59E0B');
    });

    test('should handle error type', () => {
      showToast({
        message: 'Error!',
        type: 'error'
      });

      expect(mockElement.textContent).toBe('Error!');
      expect(mockElement.className).toBe('ai-extension-toast ai-extension-toast--error');
      expect(mockElement.style.backgroundColor).toBe('#EF4444');
    });

    test('should handle custom duration', () => {
      showToast({
        message: 'Custom duration',
        duration: 5000
      });

      // Should not remove after default 3000ms
      jest.advanceTimersByTime(3000);
      expect(mockElement.style.opacity).not.toBe('0');

      // Should remove after custom 5000ms
      jest.advanceTimersByTime(2000);
      expect(mockElement.style.opacity).toBe('0');
    });
  });

  describe('Toast animation and removal', () => {
    test('should set initial animation state', () => {
      showToast('Test');

      // Initial state should be set correctly
      expect(mockElement.style.opacity).toBe('0');
      expect(mockElement.style.transform).toBe('translateX(100%)');
      expect(mockElement.style.transition).toBe('all 0.3s ease');
    });

    test('should animate out after duration', () => {
      showToast({
        message: 'Test',
        duration: 1000
      });

      // Fast forward to duration
      jest.advanceTimersByTime(1000);

      expect(mockElement.style.opacity).toBe('0');
      expect(mockElement.style.transform).toBe('translateX(100%)');
    });

    test('should remove element after animation completes', () => {
      showToast({
        message: 'Test',
        duration: 1000
      });

      // Fast forward through duration + animation time
      jest.advanceTimersByTime(1000 + 300);

      expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(mockElement);
    });

    test('should handle missing parent node gracefully', () => {
      mockElement.parentNode = null;
      
      showToast({
        message: 'Test',
        duration: 1000
      });

      // Should not throw error when parent is null
      expect(() => {
        jest.advanceTimersByTime(1300);
      }).not.toThrow();
    });
  });

  describe('Rate limiting integration', () => {
    test('should show rate limit warning toast', () => {
      showToast({
        message: 'Slow down',
        type: 'warning',
        duration: 2000
      });

      expect(mockElement.textContent).toBe('Slow down');
      expect(mockElement.className).toBe('ai-extension-toast ai-extension-toast--warning');
      expect(mockElement.style.backgroundColor).toBe('#F59E0B');

      // Should disappear after 2 seconds
      jest.advanceTimersByTime(2000);
      expect(mockElement.style.opacity).toBe('0');
    });
  });

  describe('Toast styling', () => {
    test('should apply consistent visual styles', () => {
      showToast('Styled toast');

      expect(mockElement.style.padding).toBe('12px 20px');
      expect(mockElement.style.borderRadius).toBe('8px');
      expect(mockElement.style.fontSize).toBe('14px');
      expect(mockElement.style.fontWeight).toBe('500');
      expect(mockElement.style.boxShadow).toBe('0 4px 12px rgba(0,0,0,0.15)');
      expect(mockElement.style.maxWidth).toBe('300px');
      expect(mockElement.style.wordWrap).toBe('break-word');
    });

    test('should handle long messages with word wrapping', () => {
      const longMessage = 'This is a very long toast message that should wrap properly within the maximum width constraint';
      
      showToast(longMessage);

      expect(mockElement.textContent).toBe(longMessage);
      expect(mockElement.style.maxWidth).toBe('300px');
      expect(mockElement.style.wordWrap).toBe('break-word');
    });
  });
});
