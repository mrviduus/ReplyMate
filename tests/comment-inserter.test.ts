/**
 * Comment Inserter Tests
 * Tests the AI comment insertion functionality
 */

import { insertRandomComment, injectAIButton, initializeCommentInserter } from '../src/content/inserter';
import * as detector from '../src/content/detector';
import * as llmService from '../src/llmService';

// Mock the dependencies
jest.mock('../src/content/detector');
jest.mock('../src/llmService');

const mockGetLiCommentBox = detector.getLiCommentBox as jest.MockedFunction<typeof detector.getLiCommentBox>;
const mockDraftComments = llmService.draftComments as jest.MockedFunction<typeof llmService.draftComments>;

describe('Comment Inserter', () => {
  let mockCommentBox: HTMLElement;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create mock comment box
    mockCommentBox = document.createElement('div');
    mockCommentBox.className = 'comments-comment-box__text-editor';
    mockCommentBox.contentEditable = 'true';
    
    // Mock console methods
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Clear DOM
    document.body.innerHTML = '';
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('insertRandomComment', () => {
    test('should insert random comment when box and post are available', async () => {
      const mockPost = 'Test LinkedIn post content';
      const mockComments = ['Great insight!', 'Thanks for sharing!', 'Very informative!'];
      
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: mockPost
      });
      
      mockDraftComments.mockResolvedValue(mockComments);
      
      // Spy on dispatchEvent
      const dispatchEventSpy = jest.spyOn(mockCommentBox, 'dispatchEvent');
      
      await insertRandomComment(3, 'professional');
      
      // Verify draftComments was called correctly
      expect(mockDraftComments).toHaveBeenCalledWith(mockPost, 3, ['professional']);
      
      // Verify comment was inserted
      expect(mockComments).toContain(mockCommentBox.textContent);
      
      // Verify input event was dispatched
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          bubbles: true
        })
      );
    });

    test('should warn when no comment box found', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: null,
        post: null
      });
      
      await insertRandomComment();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No LinkedIn comment box or post content found');
      expect(mockDraftComments).not.toHaveBeenCalled();
    });

    test('should warn when no post content found', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: null
      });
      
      await insertRandomComment();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No LinkedIn comment box or post content found');
      expect(mockDraftComments).not.toHaveBeenCalled();
    });

    test('should warn when no comments generated', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue([]);
      
      await insertRandomComment();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No comments generated');
    });

    test('should handle draftComments error', async () => {
      const mockError = new Error('API error');
      
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockRejectedValue(mockError);
      
      await insertRandomComment();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to insert AI comment:', mockError);
    });

    test('should use default parameters', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue(['Test comment']);
      
      await insertRandomComment();
      
      expect(mockDraftComments).toHaveBeenCalledWith('Test post', 3, ['professional']);
    });
  });

  describe('injectAIButton', () => {
    test('should inject AI button into comment boxes', () => {
      // Create comment box
      document.body.appendChild(mockCommentBox);
      
      injectAIButton();
      
      // Check that the comment box was marked as injected
      expect(mockCommentBox.getAttribute('data-ai-injected')).toBe('true');
      
      // Check that a shadow host was added
      const shadowHost = mockCommentBox.querySelector('div');
      expect(shadowHost).toBeTruthy();
      expect(shadowHost?.style.position).toBe('absolute');
    });

    test('should not inject button twice', () => {
      // Mark as already injected
      mockCommentBox.setAttribute('data-ai-injected', 'true');
      document.body.appendChild(mockCommentBox);
      
      injectAIButton();
      
      // Should not have added any children
      expect(mockCommentBox.children.length).toBe(0);
    });

    test('should set relative positioning if needed', () => {
      mockCommentBox.style.position = 'static';
      document.body.appendChild(mockCommentBox);
      
      injectAIButton();
      
      expect(mockCommentBox.style.position).toBe('relative');
    });

    test('should not change existing positioning', () => {
      mockCommentBox.style.position = 'absolute';
      document.body.appendChild(mockCommentBox);
      
      injectAIButton();
      
      expect(mockCommentBox.style.position).toBe('absolute');
    });
  });

  describe('initializeCommentInserter', () => {
    test('should set up mutation observer', () => {
      const observeSpy = jest.spyOn(MutationObserver.prototype, 'observe');
      
      initializeCommentInserter();
      
      expect(observeSpy).toHaveBeenCalledWith(document.body, {
        childList: true,
        subtree: true
      });
    });
  });
});
