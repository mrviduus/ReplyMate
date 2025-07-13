# LinkedIn Auto-Reply Extension - Usage Guide

## Quick Start

### 1. Installation & Setup

1. **Build the extension**:
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome/Edge**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" 
   - Click "Load unpacked"
   - Select the `dist` folder

3. **First-time configuration**:
   - Click the extension icon to open popup
   - Configure basic settings
   - Load AI models (this may take several minutes)

### 2. Basic Usage

1. **Navigate to LinkedIn messages** (linkedin.com/messaging)
2. **Click on a conversation** to activate auto-reply
3. **Wait for AI suggestions** to appear in the floating panel
4. **Select a response** or customize before sending

### 3. Configuration Options

#### Popup Interface (Quick Settings)
- **Extension Enable/Disable**: Master toggle
- **Auto-Reply Mode**: Automatic vs manual suggestions
- **Model Selection**: Choose between available AI models
- **Usage Statistics**: View response generation stats

#### Options Page (Comprehensive Settings)
Access via popup "Settings" button or `chrome://extensions/` → Details → Extension options

##### General Settings
- **Suggestion Mode**: Automatic or manual activation
- **Response Delay**: Time before showing suggestions (1-30 seconds)
- **Response Language**: Default language for responses
- **Analytics**: Enable/disable usage tracking

##### AI Model Configuration
- **Model Selection**: Choose primary text generation model
- **Generation Parameters**:
  - Max Tokens: Response length (50-500)
  - Temperature: Creativity level (0.1-2.0)
  - Top-P: Nucleus sampling (0.1-1.0)
- **Model Management**: Load/unload models, clear cache

##### Message Templates
- **Create Templates**: Pre-defined response templates
- **Categories**: Greeting, Follow-up, Meeting, Decline, Custom
- **Variables**: Dynamic content placeholders
- **Template Management**: Edit, delete, organize templates

##### Privacy & Data
- **Analytics Control**: Local usage statistics
- **Data Sharing**: Control what data is collected
- **Export/Import**: Backup and restore settings
- **Clear Data**: Reset all extension data

### 4. Features Overview

#### AI-Powered Response Generation
- **Local Processing**: All AI inference happens on your device
- **Context Awareness**: Considers conversation history
- **Sentiment Analysis**: Responds appropriately to message tone
- **Professional Tone**: Maintains LinkedIn-appropriate language

#### Smart LinkedIn Integration
- **Real-time Detection**: Automatically detects message composition
- **UI Injection**: Non-intrusive floating suggestion panel
- **Conversation Context**: Understands ongoing conversation flow
- **Multiple Languages**: Support for various response languages

#### Customization Options
- **Response Templates**: Create reusable message templates
- **Blacklisted Keywords**: Avoid certain words/phrases
- **Response Length**: Control verbosity of responses
- **Delay Settings**: Configure when suggestions appear

#### Privacy & Security
- **Local AI Processing**: No data sent to external servers
- **Optional Analytics**: Choose what usage data to collect
- **Secure Storage**: All data stored locally in browser
- **No Account Required**: Works without external accounts

### 5. Troubleshooting

#### Extension Not Working
1. **Check Extension Status**:
   - Ensure extension is enabled in Chrome
   - Check if LinkedIn page has loaded completely
   - Verify extension has necessary permissions

2. **Model Loading Issues**:
   - Models are large (2-4GB) and take time to download
   - Check browser memory availability
   - Clear model cache and reload if needed

3. **Response Generation Problems**:
   - Ensure selected model is fully loaded
   - Check for browser console errors
   - Try reducing response length parameters

#### Performance Issues
1. **Slow Response Generation**:
   - Large models require significant memory
   - Close unnecessary browser tabs
   - Try using smaller/quantized models

2. **High Memory Usage**:
   - Models are loaded into browser memory
   - Use only necessary models
   - Clear model cache when not in use

#### LinkedIn Integration Issues
1. **UI Not Appearing**:
   - LinkedIn frequently updates their interface
   - Refresh the LinkedIn page
   - Check browser console for JavaScript errors

2. **Suggestions Not Contextual**:
   - Ensure conversation history is being detected
   - Check that message content is being captured correctly
   - Try manually refreshing suggestions

### 6. Model Information

#### Available Models
1. **Phi-3 Mini (2.4GB)**:
   - Primary text generation model
   - Good balance of quality and performance
   - Optimized for conversational responses

2. **DistilBERT Sentiment (250MB)**:
   - Sentiment analysis for message context
   - Helps determine appropriate response tone
   - Lightweight and fast inference

#### Model Management
- **Loading**: First use requires downloading models
- **Caching**: Models cached locally for subsequent use
- **Updates**: Models updated automatically when available
- **Storage**: Stored in browser's IndexedDB

### 7. Privacy Considerations

#### Data Handling
- **Local Processing**: All AI inference happens locally
- **No External APIs**: No data sent to third-party services
- **Conversation Data**: Only analyzed locally, not stored permanently
- **Analytics**: Optional and stored locally only

#### Permissions Explanation
- **Active Tab**: Access to LinkedIn pages for message detection
- **Storage**: Store settings and cached models locally
- **Host Permissions**: LinkedIn.com for message integration

### 8. Development & Customization

#### Building from Source
```bash
# Clone repository
git clone <repository-url>
cd auto-reply

# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

#### Custom Models
The extension supports any ONNX-compatible text generation model:
1. Add model configuration to `AVAILABLE_MODELS` in constants
2. Ensure model is accessible via URL or local storage
3. Update UI to include new model option

#### Template Customization
Create custom message templates:
1. Open Options page → Templates section
2. Click "Add Template"
3. Define template with variables using `{variable}` syntax
4. Assign to appropriate category

### 9. Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| Toggle Extension | `Ctrl/Cmd + Shift + L` | Enable/disable extension |
| Show Suggestions | `Ctrl/Cmd + Shift + R` | Manual suggestion trigger |
| Accept First Suggestion | `Ctrl/Cmd + Enter` | Use first suggested response |

### 10. Best Practices

#### For Optimal Performance
- Load only models you actively use
- Clear model cache periodically
- Use appropriate response length settings
- Monitor browser memory usage

#### For Better Responses
- Provide context in your conversations
- Use templates for common scenarios
- Customize generation parameters for your style
- Review and edit suggestions before sending

#### For Privacy & Security
- Review privacy settings regularly
- Disable analytics if not needed
- Export settings as backup
- Keep extension updated

### 11. Support & Resources

#### Documentation
- [User Guide](docs/user-guide.md) - Comprehensive usage instructions
- [Developer Guide](docs/developer-guide.md) - Technical implementation details
- [API Reference](docs/api-reference.md) - Extension API documentation

#### Community Support
- [GitHub Issues](https://github.com/your-repo/issues) - Bug reports and feature requests
- [FAQ](docs/faq.md) - Frequently asked questions

#### Technical Support
- Check browser console for error messages
- Enable debug mode in extension options
- Export settings and logs for troubleshooting

---

**Note**: This extension is not affiliated with or endorsed by LinkedIn Corporation. Use responsibly and in accordance with LinkedIn's Terms of Service.
