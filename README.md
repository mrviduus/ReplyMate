# LinkedIn Auto-Reply Extension

🚀 **AI-Powered Professional Comment Generation for LinkedIn**

An intelligent Chrome extension that uses local AI inference to generate professional, contextual comments on LinkedIn posts. No data ever leaves your browser - everything runs locally using Qwen2-0.5B model.

## ✨ Features

- **🤖 Local AI Inference**: Runs Qwen2-0.5B model entirely in your browser
- **🔒 Privacy-First**: No data sent to external servers - everything stays local
- **⚡ Smart Comment Generation**: Context-aware professional comments for LinkedIn posts
- **🎯 LinkedIn-Only**: Specifically designed and optimized for LinkedIn platform
- **📝 One-Click Generation**: Simply click the "✨ AI" button to generate comments
- **⏱️ Rate Limiting**: Built-in intelligent rate limiting to prevent spam
- **💾 Model Caching**: Efficient caching system for faster subsequent loads
- **🎨 Modern UI**: Clean, professional interface that integrates seamlessly with LinkedIn
- **⚠️ Error Handling**: Robust error handling with user-friendly feedback
- **🧪 Comprehensive Testing**: 129+ unit tests and e2e testing with Cypress

## 🔧 Technical Specifications

- **AI Model**: Qwen2-0.5B (500 million parameters)
- **Inference Engine**: Local browser-based inference (no external API calls)
- **Target Platform**: LinkedIn.com only
- **Browser Support**: Chrome (Manifest V3)
- **Architecture**: Content script injection with intelligent DOM manipulation
- **Performance**: Smart model caching and rate limiting

## 🚀 Quick Start

### Installation

1. Clone this repository:
```bash
git clone https://github.com/mrviduus/linkedin-auto-reply-extension.git
cd linkedin-auto-reply-extension
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load into Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select the `dist/` directory

### Usage

1. **Navigate to LinkedIn**: Go to [linkedin.com/feed](https://linkedin.com/feed)
2. **Find a Post**: Scroll to any LinkedIn post with comments
3. **Generate Comment**: Click the "✨ AI" button that appears near comment boxes
4. **Review & Post**: Review the AI-generated comment and post when ready

## 🏗️ Development

### Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build
npm run build

# Run unit tests (129 tests)
npm test

# Run e2e tests
npm run cy:run

# Open Cypress test runner
npm run cy:open

# Type checking
npm run type-check

# Linting
npm run lint
```

### Project Structure

```
src/
├── content.js          # Main content script for LinkedIn
├── popup.ts           # Extension popup interface
├── popup.html         # Popup HTML structure
├── popup.css          # Popup styling
├── manifest.json      # Chrome extension manifest (V3)
├── common/            # Shared utilities
│   ├── modelCache.ts  # AI model caching system
│   ├── rateLimiter.ts # Rate limiting logic
│   └── llmService.ts  # Local AI inference
└── icons/            # Extension icons

tests/                 # Comprehensive test suite
├── *.test.ts         # Unit tests (129 tests)
└── e2e/              # End-to-end tests
    └── *.cy.ts       # Cypress tests

dist/                 # Built extension (after npm run build)
```

### Key Components

- **Content Script**: Detects LinkedIn comment areas and injects AI button
- **AI Service**: Handles local Qwen2 model inference
- **Model Cache**: Intelligent caching for faster model loading
- **Rate Limiter**: Prevents spam and ensures responsible usage
- **UI Components**: Clean, professional interface elements

## 🧪 Testing

This extension includes comprehensive testing:

- **Unit Tests**: 129 tests covering all major functionality
- **E2E Tests**: Cypress tests for LinkedIn comment flow
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: Robust error scenarios covered

```bash
# Run all tests
npm test

# Run e2e tests
npm run cy:run
```

## 🔒 Privacy & Security

- **100% Local Processing**: No data ever sent to external servers
- **No API Keys Required**: Everything runs in your browser
- **LinkedIn-Only**: Only activates on LinkedIn.com
- **Minimal Permissions**: Only requests necessary Chrome extension permissions

## 📊 Performance

- **Smart Caching**: Model loads once, cached for subsequent uses
- **Rate Limiting**: Intelligent throttling prevents overuse
- **Efficient DOM Manipulation**: Minimal impact on LinkedIn performance
- **Memory Management**: Optimized for browser resource usage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Qwen Team**: For providing the efficient 0.5B parameter model
- **LinkedIn**: For providing a platform that benefits from AI-enhanced interactions
- **Open Source Community**: For the tools and libraries that make this possible

---

**Version**: v0.1.0  
**AI Model**: Qwen2-0.5B  
**Platform**: LinkedIn.com  
**Privacy**: 100% Local Processing
