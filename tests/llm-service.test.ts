/**
 * LLM Service Tests
 * Tests the draftComments API functionality
 */

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
});
