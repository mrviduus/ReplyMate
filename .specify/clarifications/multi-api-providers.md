# Clarifications: Multi-API Provider Feature

## Questions & Answers

### Q1: What happens if user has no API key but selects external provider?
**A:** Show error message: "Please enter and test your API key first". The generate reply button should be disabled until a valid API key is configured.

### Q2: Should we store API keys for all providers or only active one?
**A:** Store keys for all providers. Users might switch between them frequently, and re-entering keys would be poor UX. Each provider's key is stored separately in chrome.storage.sync.

### Q3: What if Claude API is down but user selected it?
**A:** Show error: "Claude API is unavailable. Please try again later or switch to Local AI." Do NOT auto-switch to local. The user explicitly chose that provider and should maintain control.

### Q4: Should we validate API keys before saving?
**A:** Yes. The "Test API Key" button must be clicked and validation must succeed before the key is saved. This prevents invalid keys from being stored.

### Q5: How do we handle different response formats from each API?
**A:** Create adapter pattern. Each provider returns standardized format:
```typescript
interface InferenceResponse {
  reply: string;
  provider: string;
  model?: string;
  tokensUsed?: number;
  latency?: number;
}
```

### Q6: What about cost/usage tracking?
**A:** Out of scope for v1. Users manage costs through each provider's console. Future version could add optional usage tracking.

### Q7: Should we show which provider was used in the generated reply?
**A:** Yes, but subtly:
- In browser console for debugging
- Small indicator in popup showing active provider
- NOT visible in the actual LinkedIn reply

### Q8: Can user switch providers mid-session?
**A:** Yes. Next reply will use newly selected provider immediately. No need to reload extension or refresh page.

### Q9: Do we need to amend the Constitution?
**A:** Yes. Update Principle I to allow optional external APIs with explicit user consent. This is a fundamental change that requires documentation.

### Q10: What about offline usage with external APIs?
**A:** Show clear error: "External API requires internet connection. Switch to Local AI for offline usage." Check connectivity before attempting API call.

### Q11: Should we cache API responses?
**A:** No. Each request should be fresh. Caching could lead to repeated/stale responses which is poor for engagement.

### Q12: How do we handle rate limits?
**A:**
- Claude: 429 response → "Rate limit reached. Please wait 1 minute."
- Gemini: Similar handling
- OpenAI: Show remaining tokens if available
- Never auto-retry to avoid burning through quotas

### Q13: What's the fallback chain if selected provider fails?
**A:** No automatic fallback. If selected provider fails:
1. Show specific error message
2. Suggest switching to Local AI
3. Let user manually switch if desired

### Q14: How do we handle API key rotation?
**A:** User can update API key anytime:
1. Enter new key
2. Click "Test API Key"
3. On success, old key is replaced
4. No downtime if done correctly

### Q15: Should we support custom API endpoints (e.g., Azure OpenAI)?
**A:** Not in v1. Focus on official APIs first. Custom endpoints could be v2 feature.

### Q16: What about prompt template differences between providers?
**A:** Use same templates for all providers. Each provider adapter will handle any necessary formatting adjustments internally.

### Q17: How do we handle long responses from APIs?
**A:** Enforce consistent limits:
- Max 150 tokens (about 2-3 sentences)
- Truncate if needed
- Same limits as Local AI for consistency

### Q18: Should we show pricing information?
**A:** Show links to pricing pages, but not real-time costs:
- "Claude API pricing →"
- "Gemini API pricing →"
- "OpenAI API pricing →"

### Q19: What about A/B testing between providers?
**A:** Out of scope. User explicitly chooses provider. No automatic testing or comparison.

### Q20: How do we handle provider-specific features?
**A:** Stick to common denominator for v1:
- Text in → Text out
- No images, tools, or function calling
- No streaming (even though some support it)

## Technical Clarifications

### Storage Structure
```javascript
chrome.storage.sync = {
  // Provider selection
  selectedProvider: 'local' | 'claude' | 'gemini' | 'openai',

  // API Keys (encrypted by Chrome)
  apiKeys: {
    claude: 'sk-ant-...',
    gemini: 'AIza...',
    openai: 'sk-...'
  },

  // Privacy consent
  externalApiConsent: true | false,
  consentTimestamp: 1234567890,

  // Existing settings preserved
  customPrompts: { ... },
  selectedModel: '...' // For local AI
}
```

### Error Codes
```typescript
enum ProviderError {
  INVALID_KEY = 'INVALID_KEY',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  PROVIDER_DOWN = 'PROVIDER_DOWN',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED'
}
```

### Provider Priority
1. Local AI (default, always available)
2. Claude API (when configured)
3. Gemini API (when configured)
4. OpenAI API (when configured)

No automatic selection - user chooses explicitly.

## UI/UX Clarifications

### Provider Status Indicators
- 🟢 Green dot: Active and working
- 🟡 Yellow dot: Configured but not tested
- 🔴 Red dot: Error state
- ⚫ Gray dot: Not configured

### API Key Input Field
- Type: password (masked)
- Show/Hide toggle button
- Placeholder shows key format (sk-ant-... for Claude)
- Max length appropriate for each provider
- Paste support enabled
- No autocomplete

### Privacy Warning Dialog
```
┌──────────────────────────────────────┐
│  ⚠️ External API Privacy Notice      │
├──────────────────────────────────────┤
│ You're about to enable external API  │
│ mode. This means:                    │
│                                       │
│ • LinkedIn content will be sent to   │
│   third-party servers                │
│ • You'll be charged by the provider  │
│ • Internet connection required       │
│                                       │
│ Local AI mode processes everything   │
│ on your device for free.             │
│                                       │
│ ┌────────────┐  ┌─────────────────┐  │
│ │   Cancel   │  │  I Understand   │  │
│ └────────────┘  └─────────────────┘  │
└──────────────────────────────────────┘
```

## Implementation Notes

### Provider Detection
Check which SDKs are available at runtime to avoid loading unnecessary code:
```typescript
const AVAILABLE_PROVIDERS = {
  local: true, // Always available
  claude: typeof Anthropic !== 'undefined',
  gemini: typeof GoogleGenerativeAI !== 'undefined',
  openai: typeof OpenAI !== 'undefined'
};
```

### Testing Strategy
- Mock API responses for unit tests
- Use test API keys for integration tests
- Manual testing requires real API keys
- Never commit real API keys to repo

---

**Clarifications Version:** 1.0.0
**Last Updated:** 2025-10-13
**Status:** Complete
**Next Step:** Create implementation plan