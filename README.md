# 🤖 ReplyMate - AI-Powered LinkedIn Assistant

> *Your intelligent writing companion for professional LinkedIn interactions*

An intelligent Chrome extension that enhances your LinkedIn experience with AI-powered reply suggestions, running entirely locally for privacy and security.

## 🚀 Quick Start

### For Users
1. **[Download from Releases](https://github.com/mrviduus/ReplyMate/releases)** or install from Chrome Web Store (coming soon)
2. **[Follow the User Guide](USER_GUIDE.md)** for complete setup instructions

### For Developers
```bash
git clone https://github.com/mrviduus/ReplyMate.git
cd ReplyMate
npm install && npm run build
```

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| **[🎯 User Guide](USER_GUIDE.md)** | Installation and usage instructions |
| **[👩‍💻 Development Guide](DEVELOPMENT.md)** | Building, testing, and contributing |
| **[🏗️ Architecture Guide](docs/ARCHITECTURE.md)** | How ReplyMate works (explained simply) |
| **[🔧 CI/CD Pipeline](CICD.md)** | Automated building and deployment |
| **[� Full Documentation](docs/README.md)** | Complete documentation index |
| **[🛠️ Troubleshooting](docs/troubleshooting/TROUBLESHOOTING.md)** | Common issues and solutions |

## ✨ Key Features

### 🎯 LinkedIn Integration
- **Smart Post Detection**: Automatically finds LinkedIn posts as you scroll
- **One-Click Suggestions**: Generate professional replies with a single click
- **Multiple Options**: Regenerate if you want different suggestions
- **Seamless Integration**: Copy to clipboard or insert directly into comment boxes

### 📈 SSI Growth Mode (v0.4.0, in development)
- **Profile Context**: Capture your LinkedIn profile once so AI drafts read in your voice.
- **Engagement Queue**: Sidebar on the feed ranks the top 10 posts by relevance to your positioning and drafts an editable comment for each. Tone (Professional / Friendly / Enthusiastic / Thoughtful) and Length (Brief / Standard / Detailed) are per-session sliders.
- **SSI Dashboard** *(Phase C — coming)*: daily snapshot of your Social Selling Index with a 30-day trend and an actionable insight.
- **Compliance-first**: ReplyMate **never** clicks LinkedIn submit/post/send buttons programmatically. Every action is "Copy → paste → edit → you submit." See `specs/001-ssi-growth-mode/spec.md` and `.specify/memory/constitution.md` for the full set of non-negotiables.

### 🛡️ Privacy & Security
- **100% Local Processing**: AI runs on your device, no data sent to external servers
- **No Account Required**: Works without login or data collection
- **Open Source**: Full transparency with public code

### 🎨 User Experience
- **Native LinkedIn Styling**: Blends perfectly with LinkedIn's interface
- **Accessibility Ready**: Full keyboard navigation and screen reader support
- **Performance Optimized**: Minimal impact on page loading

## 🎯 How It Works

1. **Visit LinkedIn** → ReplyMate automatically detects posts
2. **Click "Generate Reply"** → AI analyzes the post content
3. **Review & Use** → Choose to regenerate, copy, or insert the suggestion
4. **Stay Authentic** → Always review and personalize before posting

## � Installation & Development

### Option 1: Automated Setup
```bash
./install.sh    # Installs dependencies, builds, and validates everything
```

### Option 2: Manual Setup
```bash
npm install     # Install dependencies
npm run build   # Build the extension
```

Then load in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → Select `dist/` folder
4. Pin ReplyMate to your toolbar

### Development Commands
```bash
npm run dev          # Development mode with hot reload
npm run test         # Run test suite
npm run build        # Production build
npm run package      # Create distribution packages
npm run lint         # Code quality checks
```

## 🛡️ Important Notice

**Professional Use Guidelines**: ReplyMate provides AI-generated suggestions to enhance your LinkedIn interactions. Please:
- ✅ Always review suggestions before posting
- ✅ Personalize content to match your voice
- ✅ Ensure compliance with LinkedIn's Terms of Service
- ✅ Use responsibly and authentically

## 🏗️ Technical Overview

**Architecture**: Chrome Extension (Manifest V3) with local AI processing
**AI Engine**: WebLLM with Qwen2/Llama models
**Languages**: TypeScript, JavaScript, HTML, CSS
**Testing**: Jest with comprehensive test coverage
**Build**: Parcel with custom scripts

For detailed technical information, see the [Architecture Guide](docs/ARCHITECTURE.md).

## 📊 Project Status

| Aspect | Status |
|--------|--------|
| ✅ Tests | All passing (132 tests) |
| ✅ Build | Automated with CI/CD |
| ✅ Code Quality | ESLint, Prettier, TypeScript |
| ✅ Security | Local processing, no data collection |
| 🔄 Chrome Store | Preparing for submission |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Ensure all tests pass: `npm test`
5. Submit a pull request

See the [Development Guide](DEVELOPMENT.md) for detailed contributing instructions.

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [WebLLM](https://github.com/mlc-ai/web-llm) for local AI inference
- The open-source community for tools and inspiration
- LinkedIn for providing a platform for professional networking

---

**Made with ❤️ for the professional community**
