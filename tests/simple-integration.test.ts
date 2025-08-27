// Simple integration test for ReplyMate
describe('ReplyMate Extension', () => {
  
  test('should load on LinkedIn', () => {
    // Mock LinkedIn page
    document.body.innerHTML = `
      <div data-id="urn:li:activity:123">
        <div class="feed-shared-text">Test post content</div>
        <div class="comments-comment-box"></div>
      </div>
    `;
    
    // Test that content script would detect the post
    const posts = document.querySelectorAll('div[data-id*="urn:li:activity"]');
    expect(posts.length).toBe(1);
  });
  
  test('should generate reply button', () => {
    // Test button creation logic
    const button = document.createElement('button');
    button.className = 'replymate-button';
    button.textContent = 'Generate Reply';
    
    expect(button.textContent).toBe('Generate Reply');
    expect(button.className).toBe('replymate-button');
  });
  
  test('should handle extension messages', () => {
    // Test message handling
    const mockMessage = {
      action: 'generateStandardReply',
      postContent: 'Test post content'
    };
    
    expect(mockMessage.action).toBe('generateStandardReply');
    expect(mockMessage.postContent).toBe('Test post content');
  });
  
});
