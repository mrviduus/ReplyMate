# ReplyMate - AI-Powered LinkedIn Assistant

![ReplyMate Extension]

An intelligent Chrome extension that enhances your LinkedIn experience with AI-powered reply generation directly within LinkedIn posts, while maintaining full chat functionality for manual testing.

## ✨ Features

### LinkedIn Integration
- 🤖 **One-Click Reply Generation**: Generate professional replies directly on LinkedIn posts
- 🔄 **Regenerate Options**: Don't like the first suggestion? Generate alternatives
- 📋 **Copy & Insert**: Easy copy-to-clipboard or direct insertion into comment boxes
- 🎨 **Native Styling**: Seamlessly blends with LinkedIn's interface
- ♿ **Accessibility**: Full keyboard navigation and screen reader support
- ⚡ **Real-time Processing**: Works with infinite scroll and dynamic content

### General Features
- 💬 **Browser Chat**: Manual chat interface for testing and general AI interactions
- 🧠 **Local AI Models**: Powered by WebLLM (Qwen2/Llama models)
- 🔒 **Privacy-First**: All processing happens locally, no data sent to external servers
- 🚀 **Performance Optimized**: Minimal impact on page loading and scrolling

## 🚀 Quick Installation

Run the automated installation script:

```bash
./install.sh
```

This script will:
- ✅ Check prerequisites (Node.js, npm, Chrome)
- 📦 Install dependencies
- 🔨 Build the extension
- 🔍 Validate all files
- 🚀 Optionally open Chrome extensions page

## 📋 Manual Installation

If you prefer manual setup:

```bash
npm install
npm run build
```

Then load the extension in Chrome:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `dist/` directory
4. Pin the ReplyMate extension to your toolbar

## 🎯 Usage

### LinkedIn Reply Generation
1. **Navigate to LinkedIn**: Open [linkedin.com](https://linkedin.com) in your browser
2. **Browse Posts**: Scroll through your LinkedIn feed as normal
3. **Generate Replies**: Click the "Generate Reply" button that appears on each post
4. **Review & Edit**: Review the AI-generated reply in the panel below the post
5. **Take Action**: 
   - **Regenerate**: Create a new suggestion
   - **Copy**: Copy to clipboard for use elsewhere
   - **Insert**: Automatically insert into LinkedIn's comment box

### Manual Chat Interface
1. **Open Extension**: Click the ReplyMate icon in your Chrome toolbar
2. **Select Model**: Choose your preferred AI model from the dropdown
3. **Start Chatting**: Type your questions or requests
4. **Get Responses**: Receive AI-powered responses for any topic

## ⚠️ Important Compliance Notice

**LinkedIn Terms of Service Warning**: This extension provides tools for generating reply suggestions. Users are responsible for:
- Reviewing all generated content before posting
- Ensuring compliance with LinkedIn's Terms of Service
- Using automation features responsibly
- Understanding that automated interactions may violate platform policies

The extension displays this warning in the browser console when used on LinkedIn.

## 🛠️ Technical Architecture

### Content Scripts
- **General Content Script** (`content.js`): Handles page content extraction for manual chat
- **LinkedIn Content Script** (`linkedin-content.ts`): Manages post detection, button injection, and reply UI

### Background Service
- **AI Engine Integration**: WebLLM-powered local inference
- **Message Routing**: Handles communication between content scripts and popup
- **LinkedIn-Specific Processing**: Optimized prompts for professional networking content

### Styling
- **Responsive Design**: Works on desktop and mobile LinkedIn
- **Accessibility**: WCAG compliant with proper contrast ratios and keyboard navigation
- **Native Integration**: Matches LinkedIn's visual design language

## 🧪 Development

### Running Tests
```bash
npm run test          # Run all tests
npm run test:watch    # Continuous testing during development
npm run test:coverage # Generate coverage report
npm run test:ci       # CI-friendly test run
```

### Development Workflow
1. **Make Changes**: Edit source files in `src/`
2. **Build**: Run `npm run build` to compile
3. **Reload Extension**: Go to `chrome://extensions/` and click reload
4. **Test**: Visit LinkedIn to test functionality

### Test Coverage
- Unit tests for core functionality
- Integration tests for LinkedIn-specific features
- DOM interaction testing
- Accessibility compliance testing
- Error handling and edge cases

## 📂 Project Structure

```
src/
├── manifest.json              # Extension manifest with LinkedIn permissions
├── popup.html/ts/css         # Manual chat interface
├── content.js                # General content script
├── linkedin-content.ts       # LinkedIn-specific functionality
├── linkedin-styles.css       # LinkedIn-specific styling
├── success-background.ts     # Background service worker
└── icons/                    # Extension icons

tests/
├── linkedin-integration.test.ts  # LinkedIn feature tests
├── popup-utils.test.ts           # Popup functionality tests
└── ...                          # Other test files
```

## 🎯 Acceptance Criteria Compliance

✅ **F-1**: Recognizes LinkedIn pages automatically  
✅ **F-2**: Detects posts dynamically with infinite scroll  
✅ **F-3**: Injects "Generate Reply" buttons near comment controls  
✅ **F-4**: Sends post content to local AI model  
✅ **F-5**: Displays generated comments in compact panels  
✅ **F-6**: Provides Regenerate, Copy, and Insert controls  
✅ **F-7**: Maintains functionality with dynamic content loading  
✅ **F-8**: Blends with LinkedIn's native styling  
✅ **F-9**: Shows ToS compliance warning in console  
✅ **F-10**: Complies with Chrome Manifest V3  

### Performance Metrics
- **Button Visibility**: >95% of visible posts receive buttons
- **Response Time**: <3 seconds for typical reply generation
- **Action Reliability**: All buttons (Regenerate, Copy, Insert) function without errors
- **Visual Integration**: No significant visual regressions in Lighthouse audits

## 🔧 Troubleshooting

### Common Issues

**Extension not loading on LinkedIn**
- Ensure you're on a `linkedin.com` domain
- Check that the extension is enabled in Chrome
- Try refreshing the page

**Generate button not appearing**
- LinkedIn may have updated their DOM structure
- Check browser console for errors
- Try scrolling to load more posts

**AI model not responding**
- First use requires model download (may take several minutes)
- Ensure stable internet connection for initial setup
- Check console for WebLLM initialization status

**Reply insertion not working**
- Try clicking LinkedIn's "Comment" button first
- Different post types may have different comment box structures
- Use "Copy" as alternative and paste manually

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- [WebLLM](https://github.com/mlc-ai/web-llm) for local AI inference
- LinkedIn for providing a platform for professional networking
- The open-source community for tools and inspiration
