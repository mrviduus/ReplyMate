# Feature Specification: Multi-API Provider Support

## Overview
Add support for external AI API providers (Claude, Gemini, OpenAI) as alternatives to the existing local WebLLM inference engine.

## User Story
As a ReplyMate user, I want to choose between:
- **Local AI** (existing WebLLM - privacy-first, runs on device)
- **Claude API** (Anthropic's API - cloud-based)
- **Gemini API** (Google's API - cloud-based)
- **OpenAI API** (GPT models - cloud-based)

So that I can select the AI provider that best fits my privacy preferences, performance needs, and budget.

## Acceptance Criteria

### 1. Provider Selection UI
- [ ] Popup shows radio buttons for provider selection:
  - Local AI (default)
  - Claude API
  - Gemini API
  - OpenAI API
- [ ] When external API selected, show API key input field
- [ ] Show "Test API Key" button to validate key
- [ ] Display privacy warning when switching to external API
- [ ] Show provider status (active, error, not configured)

### 2. API Key Management
- [ ] User can enter API key for each provider
- [ ] API keys stored securely in chrome.storage.sync
- [ ] "Show/Hide" toggle for API key field (password input)
- [ ] "Clear API Key" button to remove stored key
- [ ] Link to each provider's API key console

### 3. Inference Behavior
- [ ] When local AI selected: Use existing WebLLM (no changes)
- [ ] When external API selected: Send request to that API
- [ ] If API request fails: Show error message (do NOT auto-fallback)
- [ ] All APIs use same prompt templates (standard/withComments)

### 4. Privacy & Consent
- [ ] Show warning dialog before first external API use:
  > "⚠️ Privacy Notice: External APIs send LinkedIn content to third-party servers.
  > This differs from Local AI which processes everything on your device."
- [ ] User must click "I Understand" to proceed
- [ ] Store consent flag in chrome.storage
- [ ] Show persistent indicator in popup when external API active

### 5. Error Handling
- [ ] Invalid API key: Show "Invalid API key" error
- [ ] Network error: Show "Network error, check connection"
- [ ] Rate limit: Show "Rate limit exceeded, try again later"
- [ ] API down: Show "Provider unavailable, try Local AI"
- [ ] No fallback to local (user explicitly chose provider)

### 6. Model Selection Per Provider
- [ ] Claude: Default to `claude-3-5-sonnet-20241022`
- [ ] Gemini: Default to `gemini-1.5-flash`
- [ ] OpenAI: Default to `gpt-4o-mini`
- [ ] (Future) Allow model selection per provider

## Non-Goals (Out of Scope)
- ❌ Automatic provider switching based on performance
- ❌ Cost tracking/usage analytics
- ❌ Multi-provider comparison
- ❌ Hybrid inference (mixing providers)

## Technical Constraints
- Must maintain all existing quality gates
- Must pass TDD requirements (tests first)
- Must work with Manifest V3
- Must not break existing local AI functionality

## Success Metrics
- Users can successfully switch between providers
- API key validation works for all providers
- No privacy violations (consent required)
- Zero regression in local AI functionality

## Security Requirements
- API keys must never be logged or exposed in console
- API keys encrypted at rest via chrome.storage.sync
- Network requests must use HTTPS only
- Failed API requests must not leak API key in error messages

## User Experience Flow

### First-Time Setup
1. User opens extension popup
2. Sees "Local AI" selected by default
3. User clicks on external provider (e.g., Claude API)
4. Privacy warning dialog appears
5. User clicks "I Understand"
6. API key input field appears
7. User enters API key
8. User clicks "Test API Key"
9. Success message: "API key valid! You can now use Claude API"
10. User generates replies using Claude API

### Switching Providers
1. User opens extension popup
2. Current provider shown with status indicator
3. User selects different provider
4. If external → local: Switches immediately
5. If external → external: Shows API key field for new provider
6. If local → external: Shows privacy warning (first time only)

## Implementation Priorities
1. **P0 (Must Have):** Basic provider switching with Claude API
2. **P1 (Should Have):** All three external providers (Claude, Gemini, OpenAI)
3. **P2 (Nice to Have):** Model selection per provider
4. **P3 (Future):** Usage tracking and cost estimation

## Testing Requirements

### Unit Tests
- Each provider implementation tested in isolation
- API key validation logic
- Error handling for each provider
- Response parsing and normalization

### Integration Tests
- Provider switching flow
- API key persistence
- Privacy consent flow
- End-to-end reply generation with each provider

### Manual Testing
- Test with real API keys for each provider
- Test on actual LinkedIn posts and comments
- Test error scenarios (invalid key, network failure, rate limit)
- Test browser restart persistence

## Documentation Requirements
- Update README.md with provider setup instructions
- Add API key acquisition guides for each provider
- Document pricing implications for external APIs
- Update CLAUDE.md with technical architecture

## Release Criteria
- All tests passing (unit, integration, manual)
- Quality gates pass (TypeScript, ESLint, build)
- Documentation updated
- Privacy warning implemented and tested
- At least one external provider fully functional

---

**Specification Version:** 1.0.0
**Created:** 2025-10-13
**Status:** Draft
**Author:** ReplyMate Team