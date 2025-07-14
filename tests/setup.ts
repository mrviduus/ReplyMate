import '@testing-library/jest-dom';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onConnect: {
      addListener: jest.fn(),
    },
    sendMessage: jest.fn(),
  },
  tabs: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
};

// Assign to global
(global as any).chrome = mockChrome;

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn(),
  },
});

// Mock ProgressBar
jest.mock('progressbar.js', () => {
  return {
    Line: jest.fn().mockImplementation(() => ({
      animate: jest.fn(),
      set: jest.fn(),
      destroy: jest.fn(),
    })),
    ProgressBar: jest.fn(),
  };
});

// Mock MLC Web LLM
jest.mock('@mlc-ai/web-llm', () => ({
  CreateMLCEngine: jest.fn(),
  prebuiltAppConfig: {
    model_list: [
      { model_id: 'Qwen2-0.5B-Instruct-q4f16_1-MLC' },
      { model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC' },
    ],
  },
}));

// Setup DOM
beforeEach(() => {
  document.body.innerHTML = '';
  jest.clearAllMocks();
});

// Mock innerText property for JSDOM compatibility
Object.defineProperty(Element.prototype, 'innerText', {
  get: function() {
    return this.textContent || '';
  },
  set: function(value) {
    this.textContent = value;
  },
  configurable: true
});
