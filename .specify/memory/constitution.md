# ReplyMate Constitution
Privacy-Focused AI Chrome Extension Architecture

## Core Principles

### I. Privacy-First Architecture with Optional External APIs (AMENDED)
The extension prioritizes local AI inference by default but supports optional external API usage with explicit user consent and clear privacy warnings.

**Local-First Mode (DEFAULT):**
- WebLLM for on-device AI processing by default
- No external API calls without explicit user opt-in
- Chrome storage limited to user settings and preferences
- LinkedIn DOM content stays in browser context
- All model downloads through WebLLM's CDN only (models, not data)
- Content scripts must sanitize data before processing

**External API Mode (OPT-IN ONLY):**
- User must explicitly select external provider (Claude, Gemini, OpenAI)
- Clear privacy warning required before first use
- User must acknowledge that LinkedIn content will be sent to third-party servers
- API keys stored securely in chrome.storage.sync (encrypted by Chrome)
- HTTPS-only connections to API endpoints
- No automatic fallback to external APIs
- Provider status clearly indicated in UI

**Privacy Requirements:**
- Default to Local AI on first install
- Privacy consent dialog must be acknowledged before enabling external APIs
- Consent stored with timestamp
- Clear visual indicator when external API is active
- Option to immediately switch back to Local AI
- API keys never logged or exposed in console

**Rationale:** While privacy remains our core value with Local AI as default, users may choose external APIs for specific needs (model quality, speed, cost). This choice must be explicit, informed, and reversible. The amendment maintains privacy-first principles while respecting user autonomy.

**Amendment Date:** 2025-10-13
**Amendment Reason:** User request for multi-provider support while maintaining privacy-first default

### II. Quality Gates (MANDATORY PRE-COMMIT)
Every code change must pass all quality gates before merge. Build failures block deployment.

**Gate Requirements:**
1. TypeScript strict mode compilation with 0 errors
2. ESLint validation with 0 warnings (not just 0 errors)
3. Full test suite pass (132+ tests)
4. Test coverage maintained or improved
5. Manifest V3 validation passes
6. Build size within acceptable limits

**Enforcement:**
```bash
npm run type-check  # Must exit 0
npm run lint        # Must report 0 warnings
npm test            # All tests pass
npm run build       # Clean build required
```

**Rationale:** Quality gates prevent regression and ensure consistent code standards. The `scripts/build.sh` pipeline automates enforcement.

### III. Test-First Development (NON-NEGOTIABLE)
Tests must be written and approved before implementation. TDD cycle strictly enforced.

**Process:**
1. Write failing tests that specify desired behavior
2. Review tests with stakeholders/maintainers
3. Verify tests fail (Red phase)
4. Implement minimal code to pass tests (Green phase)
5. Refactor while maintaining green tests
6. Update coverage metrics

**Test Requirements:**
- Chrome API mocks via `tests/setup.ts`
- Unit tests for business logic
- Integration tests for component interaction
- Content script tests for DOM manipulation
- Message passing tests for chrome.runtime
- Minimum 80% code coverage (current: 132+ tests)

**Running Tests:**
```bash
npm test                    # Full suite
npm run test:watch          # Development mode
npm test -- path/to/test    # Single test file
npm run test:coverage       # Coverage report
```

**Rationale:** TDD ensures correctness, prevents regressions, and documents behavior. Tests serve as living specifications.

### IV. Chrome Extension Standards (MANIFEST V3)
All extension code must comply with Chrome's Manifest V3 architecture and security model.

**Architecture Requirements:**
- Service Worker background script (no persistent background page)
- Content Security Policy: `script-src 'self' 'wasm-unsafe-eval'`
- Message passing for background ↔ content communication
- Minimal permissions (storage, activeTab, linkedin.com host)
- No remote code execution
- Proper extension lifecycle management

**Component Boundaries:**
1. **Background Service Worker** (`src/background.ts`)
   - Manages WebLLM engine lifecycle
   - Handles model selection and fallbacks
   - Processes inference requests
   - Never accesses DOM

2. **Content Script** (`src/linkedin-content.ts`)
   - Injects UI elements into LinkedIn
   - Extracts post/comment content
   - Manages reply generation UX
   - Never performs AI inference directly

3. **Popup Interface** (`src/popup.ts`, `popup.html`)
   - User settings and controls
   - Model selection UI
   - Extension status display
   - Chrome storage API integration

**Message Protocol:**
```typescript
// Content → Background
{ type: 'generateReply', content: string }
{ type: 'getModelsInfo' }

// Background → Content
{ type: 'replyGenerated', reply: string }
{ type: 'modelError', error: string }
```

**Rationale:** Manifest V3 ensures security, performance, and future compatibility. Clear component boundaries prevent architectural drift.

### V. AI Model Management & Fallback Strategy
The extension must gracefully handle model availability, device capabilities, and inference failures.

**Model Tier System:**
1. **Professional Tier**: Llama-3.2 (best quality, high resource)
2. **Balanced Tier**: Qwen2.5 (good quality, moderate resource)
3. **Fast Tier**: Gemma-2, Phi-3.5 (quick, low resource)

**Smart Selection Algorithm:**
- Detect device GPU capabilities
- Check available memory
- Attempt preferred model from tier
- Fallback to lower tier on failure
- Provide clear user feedback on active model

**Model Lifecycle:**
```typescript
// Background service worker manages:
1. Model initialization (lazy load)
2. Inference request queuing
3. Model warm-up status
4. Error recovery and fallback
5. Model reset/reload capability
```

**Error Handling:**
- Model load failures trigger fallback
- Inference errors retry once, then fallback
- Clear error messages to user via popup
- Never lose user context during fallback

**Rationale:** Device diversity requires intelligent model management. Fallbacks ensure reliability across hardware spectrum.

### VI. LinkedIn Integration Resilience
LinkedIn's UI changes frequently. Our integration must be resilient to DOM structure changes.

**Target Selectors (Defensive):**
```typescript
// Use multiple fallback selectors
const POST_SELECTORS = [
  'div[data-id]',
  'article.feed-shared-update-v2',
  '[data-urn*="activity"]'
];

// Feature detection over assumption
if (element?.getAttribute('contenteditable') === 'true') {
  // Inject reply functionality
}
```

**Integration Principles:**
- Feature detection over element assumption
- Graceful degradation when selectors fail
- Avoid brittle XPath or deep nesting
- Test with LinkedIn's A/B test variations
- Never break LinkedIn's native functionality
- Clean up injected elements on navigation

**Testing LinkedIn Changes:**
- Test on different post types (article, poll, video)
- Test comment threads vs. top-level posts
- Test with LinkedIn Premium UI differences
- Monitor for DOM mutation patterns

**Rationale:** LinkedIn updates break extensions. Defensive coding and resilience testing maintain reliability.

## Technical Stack Requirements

### Core Technologies (LOCKED)
- **Runtime**: Chrome Extension Manifest V3
- **Language**: TypeScript (strict mode, ES2020 target)
- **AI Library**: @mlc-ai/web-llm v0.2.79
- **Build System**: Parcel 2.x with webextension target
- **Test Framework**: Jest with ts-jest and jsdom
- **Linting**: ESLint with TypeScript parser
- **Formatting**: Prettier (enforced)

### Dependency Management
- Lock versions for AI libraries (WebLLM)
- Use caret (^) for dev dependencies only
- Security audit before updates: `npm audit`
- Test model compatibility after WebLLM updates
- Document breaking changes in CHANGELOG.md

### Performance Budgets
- **Extension Size**: < 5MB (excluding models)
- **Popup Load**: < 100ms time-to-interactive
- **Button Injection**: < 50ms after DOM ready
- **Inference Latency**: Tier-dependent (Fast < 2s, Professional < 10s)
- **Memory Usage**: Monitor WebLLM heap, warn if > 2GB

### Security Standards
- **CSP**: Strict, only wasm-unsafe-eval for WebLLM
- **Permissions**: Minimal set (storage, activeTab, linkedin.com)
- **Secrets**: No API keys, tokens, or credentials in code
- **Dependencies**: Regular security audits
- **XSS Prevention**: Sanitize all LinkedIn content before display
- **Injection Safety**: Use textContent over innerHTML

## Development Workflow

### Pre-Development Checklist
1. Read CLAUDE.md for architecture overview
2. Check existing tests for similar functionality
3. Verify TypeScript types are current
4. Run `npm run dev` for hot-reload development

### Implementation Cycle
1. **Specify**: Write failing tests (TDD required)
2. **Review**: Get test approval before implementation
3. **Implement**: Write minimal code to pass tests
4. **Quality**: Pass all quality gates locally
5. **Validate**: Manual test in actual LinkedIn environment
6. **Document**: Update CLAUDE.md if architecture changes

### Build Pipeline (`scripts/build.sh`)
The build script enforces quality gates in sequence:

```bash
#!/bin/bash
# Automated quality enforcement

1. validate_dependencies   # Check npm integrity
2. npm run type-check      # TypeScript strict mode
3. npm run lint            # ESLint (0 warnings)
4. npm test                # Full test suite
5. compile_typescript      # Build to dist/
6. copy_static_assets      # Manifest, icons, HTML
7. validate_manifest       # Chrome extension validation
8. report_build_size       # Performance tracking
```

**Exit Codes:**
- `0`: Build success, ready to package
- `1`: Quality gate failure, fix before retry
- `2`: Dependency or environment issue

### Release Process
1. **Version Bump**: Update manifest.json and package.json
2. **Build**: `npm run build:script` (full pipeline)
3. **Package**: `npm run package` (creates .zip)
4. **Test**: Load unpacked extension in Chrome
5. **Validate**: Test core flows (model select, reply generation)
6. **Tag**: `git tag v[version]` and push
7. **Publish**: Submit to Chrome Web Store

### Hotfix Protocol
For critical bugs in production:
1. Branch from latest release tag
2. Write regression test that fails
3. Fix with minimal change
4. Pass all quality gates
5. Fast-track review and release

## Governance

### Constitution Authority
This constitution supersedes all other development practices, guidelines, or conventions. When conflicts arise, this document is the source of truth.

### Amendment Process
1. Propose amendment with rationale in GitHub issue
2. Discuss impact on existing code and processes
3. Require maintainer approval (consensus)
4. Document amendment date and version
5. Update CLAUDE.md if architectural changes
6. Create migration plan if breaking changes required

### Compliance Verification
- **All PRs**: Must demonstrate compliance with relevant principles
- **Code Review**: Reviewers must validate quality gates passed
- **Automated Checks**: GitHub Actions enforce build pipeline
- **Complexity**: Any deviation requires written justification

### Runtime Guidance
For day-to-day development questions, consult CLAUDE.md. For architectural decisions or principle interpretation, reference this constitution.

### Enforcement
- Violations block merge to main branch
- Repeated violations require architecture review
- Critical violations (privacy breaches) trigger immediate rollback

**Version**: 1.1.0 | **Ratified**: 2025-10-13 | **Last Amended**: 2025-10-13 (Principle I: External API Support)
