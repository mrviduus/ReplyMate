/**
 * LinkedIn Comment Detector
 * Detects LinkedIn comment boxes and associated post content
 */

export interface LiCommentResult {
  box: HTMLElement | null;
  post: string | null;
}

/**
 * Detects LinkedIn comment box and extracts associated post content
 * @returns Object containing the comment box element and post text
 */
export function getLiCommentBox(): LiCommentResult {
  // Find the LinkedIn comment box
  const box = document.querySelector('.comments-comment-box__text-editor') as HTMLElement | null;
  
  // Extract post content if comment box exists
  let post: string | null = null;
  if (box) {
    const postElement = box
      .closest('[data-id^="urn:li:activity"]')
      ?.querySelector('span[dir="ltr"]');
    const postText = postElement?.textContent?.trim();
    post = postText && postText.length > 0 ? postText : null;
  }
  
  return { box, post };
}
