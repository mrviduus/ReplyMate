# LinkedIn Auto-Reply Chrome Extension

A smart Chrome/Edge extension that provides AI-powered auto-reply suggestions for LinkedIn messages using ONNX Runtime Web for local inference.

## Features

### 🤖 AI-Powered Responses
- Local AI inference using ONNX Runtime Web
- Flan-T5-Small model for professional LinkedIn responses (~60MB)
- Context-aware response generation
- Sentiment analysis for appropriate tone matching

### 💼 Professional LinkedIn Integration
- Real-time message detection on LinkedIn
- Smart response suggestions
- Manual and automatic reply modes
- Context-aware message understanding

### 🔧 Customization Options
- Message templates for common scenarios
- Response length and tone adjustment
- Language selection
- Blacklisted keywords filtering

### 🔒 Privacy-First Design
- All AI processing happens locally
- No data sent to external servers
- Optional analytics and usage tracking
- Complete control over data sharing

### 📊 Analytics & Insights
- Response generation statistics
- Model performance metrics
- Usage analytics dashboard
- Export/import settings

## Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd auto-reply
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run dl-models
   npm run build
   ```

4. **Load in Chrome/Edge**
   - Open Chrome/Edge and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### From Chrome Web Store
*Coming soon...*

## Usage

### First Setup

1. **Install and activate** the extension
2. **Configure settings** via the popup or options page
3. **Load AI models** (first-time setup)
4. **Customize templates** for your use cases

### Daily Use

1. **Navigate to LinkedIn** messages
2. **Click on a conversation** to activate auto-reply
3. **Review AI suggestions** in the floating panel
4. **Select and send** or customize responses
5. **Monitor usage** via the popup dashboard

## Configuration

### General Settings
- **Extension Enable/Disable**: Toggle the entire extension
- **Auto-Reply Mode**: Automatic or manual suggestion mode
- **Response Delay**: Delay before showing suggestions
- **Language**: Response language preference

### AI Models
- **Flan-T5-Small**: Text-to-text generation optimized for professional responses (~60MB)
- **DistilBERT**: Sentiment analysis for message context (250MB)
- **Auto-Download**: Models downloaded and cached automatically on first use

### Response Customization
- **Max Tokens**: Control response length (20-150)
- **Temperature**: Response creativity (0.1-2.0)
- **Professional Tone**: Optimized for LinkedIn communication
- **Context Awareness**: Considers conversation history

### Templates
Create reusable message templates for:
- Professional greetings
- Meeting scheduling
- Follow-up messages
- Polite declines
- Custom scenarios

## Development

### Project Structure
```
auto-reply/
├── src/
│   ├── background/          # Service worker
│   ├── content/             # LinkedIn page integration
│   ├── popup/               # Extension popup UI
│   ├── options/             # Settings page
│   └── shared/              # Shared utilities and types
├── assets/
│   ├── icons/               # Extension icons
│   └── models/              # ONNX model files
├── manifest.json            # Extension manifest
├── webpack.config.js        # Build configuration
└── package.json             # Dependencies
```

### Available Scripts

```bash
# Development
npm run dev          # Build in development mode
npm run watch        # Build and watch for changes

# Production
npm run build        # Build for production
npm run build:prod   # Optimized production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run type-check   # TypeScript type checking

# Testing
npm run test         # Run tests
npm run test:draft   # Test Flan-T5 model generation
npm run test:watch   # Run tests in watch mode

# Models
npm run dl-models    # Download model configurations
```

### Architecture

#### Background Service Worker
- Manages AI model loading and inference
- Handles message passing between components
- Stores user settings and analytics
- Coordinates LinkedIn integration

#### Content Script
- Detects LinkedIn message interface
- Injects response suggestion UI
- Captures user interactions
- Sends messages to background worker

#### Popup Interface
- Quick settings and model status
- Usage statistics dashboard
- Model management controls
- Direct access to options page

#### Options Page
- Comprehensive settings management
- Template creation and editing
- Analytics and data export
- Privacy and data controls

### AI Integration

#### ONNX Runtime Web
- Client-side model execution
- Optimized for browser performance
- Support for quantized models
- Memory-efficient inference

#### Supported Models
- **Flan-T5-Small**: Text-to-text generation optimized for professional responses
- **DistilBERT**: Sentiment analysis for context understanding
- **ONNX Quantized**: Int8 quantization for efficient browser inference

#### Model Loading
```typescript
// Example Flan-T5 usage
import { flanT5Pipeline } from './src/worker/pipeline';

await flanT5Pipeline.initialize();
const response = await flanT5Pipeline.generate(message, {
  maxTokens: 80,
  temperature: 0.7
});
```

## Privacy & Security

### Data Handling
- **Local Processing**: All AI inference happens on-device
- **No External APIs**: No data sent to third-party services
- **Optional Analytics**: Usage stats stored locally only
- **User Control**: Complete control over data collection

### Permissions
- **Active Tab**: Access to LinkedIn pages only
- **Storage**: Local settings and model cache
- **Web Request**: LinkedIn API integration (optional)

### Security Measures
- Content Security Policy (CSP) compliance
- Sandboxed model execution
- Input validation and sanitization
- Secure inter-component communication

## Troubleshooting

### Common Issues

#### Extension Not Working
1. Check if extension is enabled
2. Refresh LinkedIn page
3. Check browser console for errors
4. Verify model loading status

#### Slow Response Generation
1. Ensure models are fully loaded
2. Check available memory
3. Reduce response length
4. Try different model

#### LinkedIn Integration Issues
1. Clear browser cache
2. Check LinkedIn page structure changes
3. Disable other LinkedIn extensions
4. Update to latest version

### Debug Mode
Enable debug logging in options:
```javascript
// Console debug information
localStorage.setItem('linkedin-autoreply-debug', 'true');
```

## Contributing

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Install dependencies: `npm install`
4. Make changes and test
5. Submit a pull request

### Code Style
- TypeScript for all source code
- ESLint configuration provided
- Prettier for code formatting
- Conventional commit messages

### Testing
- Unit tests for utilities and AI service
- Integration tests for LinkedIn interaction
- Manual testing on real LinkedIn pages

## Roadmap

### v1.1 - Enhanced AI
- [ ] Multiple model simultaneous loading
- [ ] Custom fine-tuned models
- [ ] Response quality scoring
- [ ] A/B testing framework

### v1.2 - Advanced Features
- [ ] Multi-language support
- [ ] Voice message transcription
- [ ] Calendar integration
- [ ] CRM integration

### v1.3 - Enterprise Features
- [ ] Team template sharing
- [ ] Admin dashboard
- [ ] Compliance reporting
- [ ] SSO integration

## Support

### Documentation
- [User Guide](docs/user-guide.md)
- [Developer Guide](docs/developer-guide.md)
- [API Reference](docs/api-reference.md)

### Community
- [GitHub Issues](https://github.com/your-repo/issues)
- [Discord Community](https://discord.gg/your-server)
- [FAQ](docs/faq.md)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [ONNX Runtime](https://onnxruntime.ai/) for local AI inference
- [Hugging Face](https://huggingface.co/) for pre-trained models
- [Microsoft Phi-3](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct) for text generation
- LinkedIn for the professional networking platform

---

**Note**: This extension is not affiliated with or endorsed by LinkedIn Corporation.
