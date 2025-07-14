/**
 * LinkedIn Detector Tests
 * Tests the LinkedIn comment box detection functionality
 */

import { getLiCommentBox, LiCommentResult } from '../src/content/detector';

describe('LinkedIn Comment Detector', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
  });

  test('should return null box and post on blank page', () => {
    const result: LiCommentResult = getLiCommentBox();
    
    expect(result.box).toBeNull();
    expect(result.post).toBeNull();
  });

  test('should detect LinkedIn comment box when present', () => {
    // Create mock LinkedIn DOM structure
    document.body.innerHTML = `
      <div data-id="urn:li:activity:123456">
        <span dir="ltr">This is a LinkedIn post content</span>
        <div class="comments-comment-box__text-editor" contenteditable="true"></div>
      </div>
    `;

    const result: LiCommentResult = getLiCommentBox();
    
    expect(result.box).not.toBeNull();
    expect(result.box?.classList.contains('comments-comment-box__text-editor')).toBe(true);
    expect(result.post).toBe('This is a LinkedIn post content');
  });

  test('should return null post if comment box exists but no post content found', () => {
    // Comment box without proper post structure
    document.body.innerHTML = `
      <div>
        <div class="comments-comment-box__text-editor" contenteditable="true"></div>
      </div>
    `;

    const result: LiCommentResult = getLiCommentBox();
    
    expect(result.box).not.toBeNull();
    expect(result.post).toBeNull();
  });

  test('should handle multiple comment boxes and find the first one', () => {
    document.body.innerHTML = `
      <div data-id="urn:li:activity:111">
        <span dir="ltr">First post</span>
        <div class="comments-comment-box__text-editor" contenteditable="true"></div>
      </div>
      <div data-id="urn:li:activity:222">
        <span dir="ltr">Second post</span>
        <div class="comments-comment-box__text-editor" contenteditable="true"></div>
      </div>
    `;

    const result: LiCommentResult = getLiCommentBox();
    
    expect(result.box).not.toBeNull();
    expect(result.post).toBe('First post');
  });

  test('should handle empty or whitespace-only post content', () => {
    document.body.innerHTML = `
      <div data-id="urn:li:activity:123">
        <span dir="ltr">   </span>
        <div class="comments-comment-box__text-editor" contenteditable="true"></div>
      </div>
    `;

    const result: LiCommentResult = getLiCommentBox();
    
    expect(result.box).not.toBeNull();
    expect(result.post).toBeNull();
  });
});
