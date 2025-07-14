/**
 * Comment Inserter Tests
 * Tests the AI comment insertion functionality
 */

// Mock chrome.storage first
const mockStorageGet = jest.fn();
global.chrome = {
  ...global.chrome,
  storage: {
    ...global.chrome?.storage,
    sync: {
      get: mockStorageGet,
      set: jest.fn(),
    },
  },
} as any;

// Mock modules
jest.mock('../src/content/detector', () => ({
  getLiCommentBox: jest.fn()
}));

jest.mock('../src/llmService', () => ({
  draftComments: jest.fn()
}));

jest.mock('../src/common/toast', () => ({
  showToast: jest.fn()
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn()
  },
  writable: true
});

import { insertRandomComment, injectAIButton, initializeCommentInserter, undoLastInsertion } from '../src/content/inserter';
import { getLiCommentBox } from '../src/content/detector';
import { draftComments } from '../src/llmService';
import { showToast } from '../src/common/toast';

const mockGetLiCommentBox = getLiCommentBox as jest.MockedFunction<typeof getLiCommentBox>;
const mockDraftComments = draftComments as jest.MockedFunction<typeof draftComments>;
const mockShowToast = showToast as jest.MockedFunction<typeof showToast>;
const mockClipboardWriteText = navigator.clipboard.writeText as jest.MockedFunction<typeof navigator.clipboard.writeText>;

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
    
    // Mock storage with default values
    mockStorageGet.mockResolvedValue({ tone: 'friendly', count: 3 });
    
    // Mock clipboard
    mockClipboardWriteText.mockResolvedValue();
    
    // Clear DOM
    document.body.innerHTML = '';
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('insertRandomComment', () => {
    test('should insert random comment and copy to clipboard', async () => {
      const mockPost = 'Test LinkedIn post content';
      const mockComments = ['Great insight!', 'Thanks for sharing!', 'Very informative!'];
      
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: mockPost
      });
      
      mockDraftComments.mockResolvedValue(mockComments);
      
      // Spy on dispatchEvent
      const dispatchEventSpy = jest.spyOn(mockCommentBox, 'dispatchEvent');
      
      await insertRandomComment();
      
      // Verify storage was queried
      expect(mockStorageGet).toHaveBeenCalledWith(['tone', 'count']);
      
      // Verify draftComments was called with stored settings
      expect(mockDraftComments).toHaveBeenCalledWith(mockPost, 3, ['friendly']);
      
      // Verify comment was inserted
      expect(mockComments).toContain(mockCommentBox.textContent);
      
      // Verify input event was dispatched
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          bubbles: true
        })
      );
      
      // Verify clipboard copy
      expect(mockClipboardWriteText).toHaveBeenCalledWith(mockCommentBox.textContent);
      
      // Verify success toast with undo action
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Inserted',
        type: 'success',
        duration: 6000,
        action: {
          label: 'Undo',
          callback: expect.any(Function)
        }
      });
    });

    test('should handle clipboard error gracefully', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue(['Test comment']);
      mockClipboardWriteText.mockRejectedValue(new Error('Clipboard access denied'));
      
      // Should not throw error
      await expect(insertRandomComment()).resolves.not.toThrow();
      
      // Should still show success toast
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Inserted',
        type: 'success'
      }));
    });

    test('should use default values when storage is empty', async () => {
      mockStorageGet.mockResolvedValue({});
      
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue(['Test comment']);
      
      await insertRandomComment();
      
      expect(mockDraftComments).toHaveBeenCalledWith('Test post', 3, ['friendly']);
    });

    test('should warn when no comment box found', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: null,
        post: null
      });
      
      await insertRandomComment();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No LinkedIn comment box or post content found');
      expect(mockDraftComments).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    test('should warn when no post content found', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: null
      });
      
      await insertRandomComment();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No LinkedIn comment box or post content found');
      expect(mockDraftComments).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    test('should warn when no comments generated', async () => {
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue([]);
      
      await insertRandomComment();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('No comments generated');
      expect(mockShowToast).not.toHaveBeenCalled();
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
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    test('should handle custom tone and count from storage', async () => {
      mockStorageGet.mockResolvedValue({ tone: 'expert', count: 5 });
      
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue(['Expert comment']);
      
      await insertRandomComment();
      
      expect(mockDraftComments).toHaveBeenCalledWith('Test post', 5, ['expert']);
    });
  });

  describe('undoLastInsertion', () => {
    test('should undo last insertion when undo state exists', async () => {
      // First, insert a comment to create undo state
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue(['AI generated comment']);
      mockCommentBox.textContent = 'Original text';
      
      await insertRandomComment();
      
      // Clear previous toast calls
      mockShowToast.mockClear();
      
      // Now test undo
      const dispatchEventSpy = jest.spyOn(mockCommentBox, 'dispatchEvent');
      
      undoLastInsertion();
      
      // Should restore original text
      expect(mockCommentBox.textContent).toBe('Original text');
      
      // Should dispatch input event
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input',
          bubbles: true
        })
      );
      
      // Should show undo toast
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Undone',
        type: 'info',
        duration: 2000
      });
    });

    test('should show info message when nothing to undo', () => {
      undoLastInsertion();
      
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Nothing to undo',
        type: 'info',
        duration: 2000
      });
    });

    test('should clear undo state after undoing', async () => {
      // First, insert a comment
      mockGetLiCommentBox.mockReturnValue({
        box: mockCommentBox,
        post: 'Test post'
      });
      
      mockDraftComments.mockResolvedValue(['AI comment']);
      
      await insertRandomComment();
      
      // Undo once
      undoLastInsertion();
      
      // Clear mock calls
      mockShowToast.mockClear();
      
      // Try to undo again - should show "Nothing to undo"
      undoLastInsertion();
      
      expect(mockShowToast).toHaveBeenCalledWith({
        message: 'Nothing to undo',
        type: 'info',
        duration: 2000
      });
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
