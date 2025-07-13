# GitHub Copilot Instructions for LinkedIn Auto-Reply Extension

This document provides context and guidelines for GitHub Copilot when working on the LinkedIn Auto-Reply Chrome extension.

## Project Overview

This is a Chrome/Edge Manifest V3 extension that provides AI-powered auto-reply suggestions for LinkedIn messages using ONNX Runtime Web for local inference. The extension prioritizes privacy by processing all AI inference locally without sending data to external servers.

## Architecture

### Core Components

1. **Background Service Worker** (`src/background/background.ts`)
   - Manages AI model loading and inference using ONNX Runtime Web
   - Handles inter-component communication
   - Stores settings and usage statistics
   - Coordinates LinkedIn integration

2. **Content Script** (`src/content/content.ts`)
   - Detects LinkedIn message interface changes
   - Injects response suggestion UI elements
   - Captures user interactions with messages
   - Communicates with background worker

3. **Popup Interface** (`src/popup/`)
   - Quick settings and model status dashboard
   - Usage statistics display
   - Model management controls
   - Direct access to full options page

4. **Options Page** (`src/options/`)
   - Comprehensive settings management
   - Message template creation and editing
   - Advanced AI model configuration
   - Privacy controls and data export

5. **Shared Utilities** (`src/shared/`)
   - TypeScript type definitions
   - Constants and configuration
   - Utility functions and logging
   - AI service abstraction layer

### Technology Stack

- **TypeScript** for type safety and better development experience
- **ONNX Runtime Web** for local AI model inference
- **Hugging Face Transformers** for model loading and tokenization
- **Webpack** for bundling and optimization
- **Chrome Extension APIs** for browser integration
- **CSS3** with CSS custom properties for theming

## Key Design Principles

### Privacy-First
- All AI processing happens locally in the browser
- No data sent to external servers or APIs
- User has complete control over data collection
- Optional analytics stored locally only

### Performance
- Lazy loading of AI models to reduce initial load time
- Efficient memory management for large language models
- Debounced user interactions to prevent excessive processing
- Background processing to avoid blocking UI

### User Experience
- Non-intrusive LinkedIn integration
- Customizable response suggestions
- Professional tone and formatting
- Accessible and responsive design

### Extensibility
- Modular architecture for easy feature additions
- Support for multiple AI models
- Configurable response templates
- Plugin-like component system

## Development Guidelines

### Code Style
```typescript
// Use consistent naming conventions
interface ComponentSettings {
  isEnabled: boolean;
  responseMode: 'automatic' | 'manual';
}

// Prefer async/await over promises
async function loadModel(modelId: string): Promise<void> {
  try {
    const model = await onnxService.loadModel(modelId);
    // Handle success
  } catch (error) {
    logger.error('Failed to load model:', error);
    // Handle error
  }
}

// Use proper error handling
class AIService {
  async generateResponse(message: string): Promise<string[]> {
    if (!this.isModelLoaded()) {
      throw new Error('Model not loaded');
    }
    // Implementation
  }
}
```

### Message Passing
```typescript
// Use typed message interfaces
interface GenerateResponseMessage {
  type: 'generate_response';
  payload: {
    message: string;
    context: string[];
    conversationId: string;
  };
}

// Always handle both success and error cases
const response = await sendMessageToBackground(message);
if (response.success) {
  // Handle success
} else {
  logger.error('Request failed:', response.error);
  // Handle error
}
```

### LinkedIn Integration
```typescript
// Use robust selectors that handle LinkedIn's dynamic UI
const MESSAGE_SELECTORS = {
  INPUT: '[contenteditable="true"][data-placeholder*="message"]',
  SEND_BUTTON: 'button[data-control-name="send_message"]',
  THREAD: '.msg-s-message-list__event'
};

// Always check for element existence
const messageInput = document.querySelector(MESSAGE_SELECTORS.INPUT);
if (messageInput) {
  // Safe to interact with element
}
```

### AI Model Integration
```typescript
// Handle model loading states properly
class ModelManager {
  private modelStates = new Map<string, ModelState>();
  
  async loadModel(modelId: string): Promise<void> {
    this.setModelState(modelId, 'loading');
    try {
      const model = await this.onnxService.loadModel(modelId);
      this.setModelState(modelId, 'loaded');
    } catch (error) {
      this.setModelState(modelId, 'error');
      throw error;
    }
  }
}
```

## File Structure Understanding

```
src/
├── background/
│   └── background.ts          # Main service worker logic
├── content/
│   ├── content.ts            # LinkedIn page integration
│   └── content.css           # Injected UI styles
├── popup/
│   ├── popup.html            # Popup interface HTML
│   ├── popup.ts              # Popup logic and controls
│   └── popup.css             # Popup styling
├── options/
│   ├── options.html          # Settings page HTML
│   ├── options.ts            # Settings management logic
│   └── options.css           # Settings page styling
└── shared/
    ├── types.ts              # TypeScript type definitions
    ├── constants.ts          # App constants and configuration
    ├── utils.ts              # Utility functions and helpers
    └── ai-service.ts         # AI model abstraction layer
```

## Common Patterns

### State Management
```typescript
// Use consistent state management patterns
class ComponentController {
  private state: ComponentState = this.getInitialState();
  
  private async updateState(updates: Partial<ComponentState>): Promise<void> {
    this.state = { ...this.state, ...updates };
    await this.persistState();
    this.updateUI();
  }
}
```

### Error Handling
```typescript
// Implement comprehensive error handling
class ServiceWithErrorHandling {
  private logger = new Logger('ServiceName');
  
  async performOperation(): Promise<Result> {
    try {
      const result = await this.riskyOperation();
      this.logger.info('Operation completed successfully');
      return result;
    } catch (error) {
      this.logger.error('Operation failed:', error);
      this.notifyUser('Operation failed. Please try again.');
      throw error;
    }
  }
}
```

### UI Updates
```typescript
// Update UI reactively based on state changes
class UIController {
  private updateUI(): void {
    this.updateModelStatus();
    this.updateUsageStats();
    this.updateSettingsForm();
  }
  
  private updateModelStatus(): void {
    const statusElement = document.getElementById('modelStatus');
    if (statusElement && this.modelState) {
      statusElement.textContent = this.modelState.status;
      statusElement.className = `status-${this.modelState.status}`;
    }
  }
}
```

## Testing Considerations

### Unit Testing
- Test utility functions in isolation
- Mock external dependencies (Chrome APIs, ONNX models)
- Validate type safety and error handling

### Integration Testing
- Test message passing between components
- Validate LinkedIn page integration
- Test model loading and inference pipeline

### Manual Testing
- Test on real LinkedIn pages with various UI states
- Verify extension works across different LinkedIn layouts
- Test with different browser configurations

## Performance Optimization

### Model Loading
- Implement progressive model loading
- Cache models in browser storage
- Use quantized models for better performance
- Implement model warm-up strategies

### Memory Management
- Monitor memory usage during inference
- Implement model unloading for memory pressure
- Use efficient data structures for message history
- Clean up event listeners and observers

### UI Performance
- Debounce user interactions
- Use virtual scrolling for large lists
- Implement lazy loading for UI components
- Optimize CSS for smooth animations

## Security Considerations

### Content Security Policy
- Follow strict CSP guidelines for Manifest V3
- Avoid inline scripts and eval()
- Use secure communication channels
- Validate all user inputs

### Data Privacy
- Minimize data collection and storage
- Implement secure local storage
- Provide clear privacy controls
- Follow GDPR/privacy compliance requirements

## Browser Compatibility

### Chrome/Edge Support
- Target Manifest V3 APIs
- Use modern JavaScript features with appropriate polyfills
- Test across different browser versions
- Handle browser-specific behaviors

### Extension APIs
- Use chrome.runtime for inter-component communication
- Leverage chrome.storage for persistent data
- Implement proper permission handling
- Follow extension security best practices

## When Adding New Features

1. **Define Types First**: Always start with TypeScript interfaces
2. **Update Constants**: Add new message types and configuration
3. **Implement Core Logic**: Start with the background service worker
4. **Add UI Components**: Create user interface elements
5. **Update Documentation**: Keep README and comments current
6. **Test Thoroughly**: Manual and automated testing
7. **Consider Privacy**: Ensure new features maintain privacy principles

## Common Gotchas

- LinkedIn frequently changes their DOM structure - use resilient selectors
- ONNX models can be large - implement proper loading states
- Chrome extension context can be lost - handle context invalidation
- Memory leaks with AI models - implement proper cleanup
- Race conditions in async operations - use proper synchronization

This context should help Copilot provide more accurate and contextually appropriate suggestions when working on this extension.
