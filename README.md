# ReplyMate LinkedIn Auto-Reply Extension

![ReplyMate Extension]

An AI-powered LinkedIn assistant that helps you craft intelligent replies to LinkedIn messages and comments.

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

1. Visit LinkedIn.com
2. Click the ReplyMate icon in your toolbar
3. Use the AI-powered suggestions for replies
4. Monitor extension status via the popup interface

## 🧪 Development

```bash
npm run test          # Run tests
npm run test:watch    # Continuous testing
npm run test:coverage # Coverage report
```
