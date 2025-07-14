/**
 * Content Script Tests
 * Tests the functionality that extracts page content and communicates with the popup
 */

describe('Content Script', () => {
  let mockPort: any;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Clear Jest module cache to ensure fresh require
    jest.resetModules();
    
    // Mock Chrome APIs
    global.chrome = {
      runtime: {
        onConnect: {
          addListener: jest.fn()
        }
      }
    } as any;

    // Create mock port
    mockPort = {
      onMessage: {
        addListener: jest.fn()
      },
      postMessage: jest.fn()
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  test('should set up connection listener', () => {
    // Load the content script
    require('../src/content.js');

    // Verify that onConnect listener was added
    expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledTimes(1);
    expect(chrome.runtime.onConnect.addListener).toHaveBeenCalledWith(expect.any(Function));
  });

  test('should extract page content when message is received', () => {
    // Set up DOM content
    document.body.innerHTML = '<div>Test content <span>nested text</span></div>';

    // Load the content script
    require('../src/content.js');

    // Get the connection listener function
    const addListenerCalls = (chrome.runtime.onConnect.addListener as jest.Mock).mock.calls;
    expect(addListenerCalls.length).toBeGreaterThan(0);
    const connectionListener = addListenerCalls[0][0];

    // Simulate connection
    connectionListener(mockPort);

    // Verify message listener was added
    expect(mockPort.onMessage.addListener).toHaveBeenCalledTimes(1);

    // Get the message listener function
    const messageListenerCalls = mockPort.onMessage.addListener.mock.calls;
    expect(messageListenerCalls.length).toBeGreaterThan(0);
    const messageListener = messageListenerCalls[0][0];

    // Simulate message (content script responds to any message)
    messageListener({});

    // Verify response
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      contents: 'Test content nested text'
    });
  });

  test('should handle empty page content', () => {
    // Set up empty DOM
    document.body.innerHTML = '';

    require('../src/content.js');

    const connectionListener = (chrome.runtime.onConnect.addListener as jest.Mock).mock.calls[0][0];
    connectionListener(mockPort);

    const messageListener = mockPort.onMessage.addListener.mock.calls[0][0];
    messageListener({});

    expect(mockPort.postMessage).toHaveBeenCalledWith({
      contents: ''
    });
  });
});
