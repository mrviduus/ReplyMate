/**
 * LLM Service Tests
 * Tests the draftComments API functionality
 */

// Mock rate limiter and toast
const mockAllowRequest = jest.fn();
const mockShowToast = jest.fn();

jest.mock('../src/common/rateLimiter', () => ({
  defaultRateLimiter: {
    allowRequest: mockAllowRequest
  }
}));

jest.mock('../src/common/toast', () => ({
  showToast: mockShowToast
}));

import { draftComments } from '../src/llmService';

// Mock chrome.runtime
const mockSendMessage = jest.fn();
global.chrome = {
  ...global.chrome,
  runtime: {
    ...global.chrome?.runtime,
    sendMessage: mockSendMessage,
    lastError: undefined,
  },
} as any;

describe('LLM Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (global.chrome.runtime as any).lastError;
    
    // Default: allow requests (rate limiter not triggered)
    mockAllowRequest.mockReturnValue(true);
  });

  describe('draftComments', () => {
    test('should send correct message to service worker', async () => {
      const mockComments = ['Great post!', 'Thanks for sharing!'];
      mockSendMessage.mockImplementation((message, callback) => {
        callback({ comments: mockComments });
      });

      const post = 'Test LinkedIn post content';
      const count = 2;
      const personas = ['professional', 'casual'];

      await draftComments(post, count, personas);

      expect(mockSendMessage).toHaveBeenCalledWith(
        {
          type: 'draftComment',
          post: 'Test LinkedIn post content',
          count: 2,
          personas: ['professional', 'casual']
        },
        expect.any(Function)
      );
    });

    test('should return generated comments from service worker', async () => {
      const mockComments = ['Great insights!', 'Very informative post!'];
      mockSendMessage.mockImplementation((message, callback) => {
        callback({ comments: mockComments });
      });

      const result = await draftComments('Test post', 2, ['professional']);

      expect(result).toEqual(mockComments);
    });

    test('should handle chrome.runtime.lastError', async () => {
      const errorMessage = 'Extension context invalidated';
      mockSendMessage.mockImplementation((message, callback) => {
        (global.chrome.runtime as any).lastError = { message: errorMessage };
        callback({});
      });

      await expect(draftComments('Test post', 1, ['professional']))
        .rejects
        .toThrow(errorMessage);
    });

    test('should handle service worker errors', async () => {
      const errorMessage = 'Failed to generate comments';
      mockSendMessage.mockImplementation((message, callback) => {
        callback({ error: errorMessage });
      });

      await expect(draftComments('Test post', 1, ['professional']))
        .rejects
        .toThrow(errorMessage);
    });

    test('should return empty array if no comments in response', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({});
      });

      const result = await draftComments('Test post', 1, ['professional']);

      expect(result).toEqual([]);
    });

    test('should handle multiple personas correctly', async () => {
      const mockComments = ['Professional comment', 'Casual comment', 'Enthusiastic comment'];
      mockSendMessage.mockImplementation((message, callback) => {
        expect(message.personas).toEqual(['professional', 'casual', 'enthusiastic']);
        callback({ comments: mockComments });
      });

      const result = await draftComments(
        'Interesting post about AI',
        3,
        ['professional', 'casual', 'enthusiastic']
      );

      expect(result).toEqual(mockComments);
    });
  });

  describe('Rate Limiting', () => {
    test('should check rate limiter before making request', async () => {
      mockSendMessage.mockImplementation((message, callback) => {
        callback({ comments: ['Test comment'] });
      });

      await draftComments('Test post', 1, ['professional']);

      expect(mockAllowRequest).toHaveBeenCalledTimes(1);
    });

    test('should show toast and reject when rate limited', async () => {
      mockAllowRequest.mockReturnValue(false);

      await expect(draftComments('Test post', 1, ['professional']))
        .rejects
        .toThrow('Rate limit exceeded');

      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Slow down',
        type: 'warning',
        duration: 2000
      });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    test('should proceed normally when rate limiter allows request', async () => {
      mockAllowRequest.mockReturnValue(true);
      mockSendMessage.mockImplementation((message, callback) => {
        callback({ comments: ['Generated comment'] });
      });

      const result = await draftComments('Test post', 1, ['professional']);

      expect(result).toEqual(['Generated comment']);
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalled();
    });

    test('should not show toast for successful requests', async () => {
      mockAllowRequest.mockReturnValue(true);
      mockSendMessage.mockImplementation((message, callback) => {
        callback({ comments: ['Success comment'] });
      });

      await draftComments('Test post', 1, ['professional']);

      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });
});
