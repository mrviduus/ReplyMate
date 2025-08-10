# ReplyMate Quick Reference

## 🚀 Development Commands

### Setup & Installation
```bash
git clone https://github.com/mrviduus/ReplyMate.git
cd ReplyMate
npm install                 # Install dependencies
```

### Development Workflow
```bash
npm run dev                 # Start development mode (watch)
npm run build               # Production build
npm run build:script        # Advanced build with validation
npm run clean               # Clean all build artifacts
```

### Testing
```bash
npm run test                # Run all tests
npm run test:watch          # Run tests in watch mode
npm run test:coverage       # Generate coverage report
npm run test:ci             # CI mode (no watch)
```

### Code Quality
```bash
npm run lint                # Check linting
npm run lint:fix            # Auto-fix linting issues
npm run format              # Format code with Prettier
npm run format:check        # Check code formatting
npm run type-check          # TypeScript type checking
```

### Packaging & Release
```bash
npm run package             # Create ZIP packages
npm run zip                 # Build + package in one command
./scripts/version-bump.sh --type patch  # Bump version
```

## 📁 File Structure
```
src/
├── manifest.json           # Extension configuration
├── background.ts           # Service worker (AI handling)
├── linkedin-content.ts     # LinkedIn integration
├── popup.ts/html/css      # Extension popup
├── content.js             # General content script
└── icons/                 # Extension icons

tests/                     # Test files
scripts/                   # Build automation
.github/workflows/         # CI/CD pipelines
```

## 🛠️ Chrome Extension Development

### Load Extension
1. Go to `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked" → select `dist/` folder

### Debug Extension
- **Background**: `chrome://extensions/` → "Inspect views: background page"
- **Content Script**: LinkedIn page → F12 → Console
- **Popup**: Right-click popup → "Inspect"

### Hot Reload
1. Change files in `src/`
2. Extension auto-rebuilds (if using `npm run dev`)
3. Go to `chrome://extensions/` → click reload icon
4. Refresh LinkedIn pages

## 🔄 Version & Release

### Version Bumping
```bash
./scripts/version-bump.sh --type patch   # 0.2.0 → 0.2.1
./scripts/version-bump.sh --type minor   # 0.2.0 → 0.3.0
./scripts/version-bump.sh --type major   # 0.2.0 → 1.0.0
./scripts/version-bump.sh --dry-run      # Preview changes
```

### Release Process
```bash
# 1. Bump version and create tag
./scripts/version-bump.sh --type patch

# 2. Push to trigger CI/CD
git push origin main --tags

# 3. GitHub Actions automatically:
#    - Runs tests
#    - Creates release
#    - Uploads ZIP packages
```

## 🧪 Testing Quick Guide

### Test Structure
- `chrome-api.test.ts` - Chrome API mocking
- `linkedin-integration.test.ts` - LinkedIn functionality
- `popup-utils.test.ts` - Popup interface
- `content.test.ts` - Content scripts
- `performance-error.test.ts` - Error handling

### Common Test Commands
```bash
npm test -- chrome-api.test.ts           # Specific test file
npm test -- --testNamePattern="LinkedIn" # Pattern matching
npm test -- --watch                      # Watch mode
npm test -- --updateSnapshot             # Update snapshots
```

## 🚨 Troubleshooting

### Build Issues
```bash
npm run clean              # Clear caches
rm -rf node_modules        # Fresh install
npm install
npm run build
```

### Extension Issues
- Check manifest.json syntax
- Verify permissions in Chrome
- Check console for errors
- Reload extension after changes

### LinkedIn Integration
- Refresh LinkedIn page
- Check content script injection
- Verify host permissions match
- Test with different post types

## 📊 Performance Tips

### Development
- Use `npm run dev` for hot reload
- Close unnecessary tabs
- Monitor memory usage
- Profile with Chrome DevTools

### Production
- Minimize bundle size
- Optimize AI model loading
- Test on slower devices
- Monitor extension performance

## 🔐 Security Checklist

- ✅ Minimal permissions requested
- ✅ No inline scripts or eval()
- ✅ CSP compliant
- ✅ Input validation
- ✅ Secure communication
- ✅ Privacy-first design

## 📚 Key Documentation

- **[Development Guide](DEVELOPMENT.md)** - Complete developer docs
- **[User Guide](USER_GUIDE.md)** - End-user instructions  
- **[CI/CD Pipeline](CICD.md)** - Automation details
- **[Requirements](docs/LinkedIn_ReplyMate_Requirements.md)** - Technical specs

## 🔗 Useful Links

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Guide](https://developer.chrome.com/docs/extensions/mv3/)
- [WebLLM Documentation](https://mlc.ai/web-llm/)
- [GitHub Repository](https://github.com/mrviduus/ReplyMate)

---

*Keep this reference handy while developing ReplyMate! 🚀*
