<!--
Sync Impact Report — v1.1.0 (2026-05-14)
=========================================
Version bump: 1.0.0 → 1.1.0 (MINOR — added principles VII–VIII; clarified II/IV/V; no removals)

Principles changed:
  - II. Quality Gates → replaced brittle "132+ tests" with coverage threshold + green-suite gate;
                        clarified ESLint must use @typescript-eslint/parser (currently in devDeps but unwired — TODO)
  - IV. Chrome Extension Standards → updated permission minimum set to the actual MV3 surface
                                     (storage, tabs, activeTab, windows, alarms); message-protocol example
                                     now uses { action } not { type } to match shipped code
  - V. AI Model Management → renamed selection signals (deviceMemory + hardwareConcurrency, not GPU)

Principles added:
  - VII. Service Worker Lifecycle (NON-NEGOTIABLE) — keep-alive + cold-start handling for MV3
  - VIII. LinkedIn DOM Capture Hygiene — anonymization rules for fixtures committed to git

Compliance amendments:
  - Privacy-First section now lists explicit self-page background-load carve-outs (/sales/ssi, /in/{me})
    so feature specs (e.g., 001-ssi-growth-mode) don't widen the constraint by accident.

Templates / refs requiring follow-up alignment:
  - specs/001-ssi-growth-mode/spec.md §Compliance Constraint #2 (Profile Context background tab)
  - specs/001-ssi-growth-mode/plan.md §Manifest Changes (content_scripts match for /in/*)
  - .eslintrc.json (wire @typescript-eslint/parser per Principle II)

Files removed from prior versions of this doc:
  - "Full test suite pass (132+ tests)" magic number (Principle II)
  - GPU-only language in Principle V
-->

# ReplyMate Constitution
Privacy-Focused AI Chrome Extension Architecture

## Core Principles

### I. Privacy-First Architecture (NON-NEGOTIABLE)
All AI inference MUST occur locally on the user's device. No user data, LinkedIn content, or generated replies may be transmitted to external servers.

**Requirements:**
- WebLLM for on-device AI processing only
- No external API calls for user content or inference
- Chrome storage limited to user settings, preferences, captured-locally artifacts (profile context, SSI snapshots, drafts)
- LinkedIn DOM content must never leave the browser context
- All model downloads through WebLLM's CDN only (models, not data)
- Content scripts must sanitize data before processing

**Background-tab carve-outs (closed list).** The extension MAY load LinkedIn pages in inactive background tabs ONLY for these specific read-only captures:
1. `https://www.linkedin.com/sales/ssi` — daily SSI score snapshot
2. `https://www.linkedin.com/in/{me}/` — user's own profile (capture + auto-refresh)

Both MUST be read-only DOM parse, MUST close the tab when done, MUST NOT click any submit/post/send buttons, and MUST be scoped to the authenticated user's own resource. Any new background-load target requires a constitution amendment, not a feature spec.

**Rationale:** Users trust ReplyMate with sensitive professional communications. Privacy is our core value proposition and competitive advantage. Closed-list carve-outs keep the privacy story enforceable as features grow.

### II. Quality Gates (MANDATORY PRE-COMMIT)
Every code change must pass all quality gates before merge. Build failures block deployment.

**Gate Requirements:**
1. TypeScript strict mode compilation with 0 errors
2. ESLint validation with 0 warnings (not just 0 errors). ESLint MUST use `@typescript-eslint/parser` so `.ts` sources are actually covered, not skipped by the JS-only glob.
3. Full test suite passes (no skipped tests in main)
4. Coverage on new/modified pure-logic modules ≥ 85% lines + branches
5. Manifest V3 validation passes
6. Build size within budget (Principle V)

**Enforcement:**
```bash
npm run type-check  # exits 0
npm run lint        # 0 warnings; lint glob must include *.ts
npm test            # all tests pass; coverage gate enforced
npm run build       # clean Parcel build
```

**Rationale:** Magic test-count numbers go stale; coverage + green-suite is the durable contract. Lint that silently skips `.ts` is worse than no lint.

### III. Test-First Development (NON-NEGOTIABLE)
Tests must be written and approved before implementation. TDD cycle strictly enforced for behavior-bearing code.

**Process:**
1. Write failing tests that specify desired behavior
2. Review tests with stakeholders/maintainers
3. Verify tests fail (Red phase)
4. Implement minimal code to pass tests (Green phase)
5. Refactor while maintaining green tests

**Test Requirements:**
- Chrome API mocks via `tests/setup.ts`
- Unit tests for business logic, fixture-driven tests for DOM parsers
- Integration tests for message-passing flows
- Pure-logic modules (scorers, parsers, prompt builders) target ≥ 90% line coverage

**TDD scope exemption.** Non-behavior changes — CSS-only edits, documentation, static asset moves, manifest metadata bumps — do NOT require a Red-first test. Any task that adds or changes runtime behavior does.

**Rationale:** TDD ensures correctness, prevents regressions, and documents behavior. Tests serve as living specifications.

### IV. Chrome Extension Standards (MANIFEST V3)
All extension code must comply with Chrome's Manifest V3 architecture and security model.

**Architecture Requirements:**
- Service Worker background script (no persistent background page)
- Content Security Policy: `script-src 'self' 'wasm-unsafe-eval'`
- Message passing for background ↔ content communication
- Minimal permissions: `storage`, `tabs`, `activeTab`, `windows`, `alarms`. `host_permissions` limited to `https://*.linkedin.com/*`. Any addition requires constitution amendment.
- No remote code execution
- Proper extension lifecycle management

**Component Boundaries:**
1. **Background Service Worker** (`src/background.ts`)
   - Manages WebLLM engine lifecycle (via `src/model-loader.ts` singleton — single entry point)
   - Handles model selection and fallbacks
   - Processes inference requests
   - Never accesses DOM directly

2. **Content Scripts** (`src/linkedin-content.ts` + per-feature scripts)
   - Inject UI / parse DOM on their matched routes
   - Send extracted data to background via message passing
   - Never perform AI inference directly

3. **Popup Interface** (`src/popup.ts`, `popup.html`)
   - User settings, model selection, status, manual chat
   - Communicates with background via message passing only

**Message Protocol:**
Messages use `{ action: string, ...payload }`. Responses are plain objects.
```typescript
// Content/popup → Background
{ action: 'generateReply', postContent: string, postId: string }
{ action: 'getModelsInfo' }
{ action: 'ssi.captureNow' }

// Background → tabs (broadcast)
{ action: 'modelLoadProgress', progress: number, stage: string }
```
New actions SHOULD use dotted namespaces (`ssi.*`, `queue.*`, `profile.*`).

**Rationale:** Manifest V3 ensures security, performance, and future compatibility. The actually-shipped permission set is the contract; listing fewer than ship is misleading.

### V. AI Model Management & Fallback Strategy
The extension must gracefully handle model availability, device capabilities, and inference failures.

**Model Tier System:**
1. **Professional Tier**: Llama-3.2-3B (best quality, high resource)
2. **Balanced Tier**: Llama-3.2-1B (good quality, moderate resource)
3. **Fast Tier**: Qwen2.5-0.5B / Phi-3.5-mini / Gemma-2 (quick, low resource)

**Smart Selection Signals** (`getOptimalBackgroundModel` in `background.ts`):
- `navigator.deviceMemory` (RAM in GB) — primary signal
- `navigator.hardwareConcurrency` (CPU cores) — secondary signal
- Thresholds: ≥8 GB & ≥8 cores → 3B; ≥4 GB or ≥4 cores → 1B; otherwise → 0.5B

(WebGPU adapter info is not currently used; if added in the future, update this section in the same PR.)

**Model Lifecycle (single owner):** `model-loader.ts` is the only path that calls `CreateMLCEngine`. It handles preload queue, retry, timeout, per-model loading state. Direct calls elsewhere are a constitution violation.

**Error Handling:** Load failures retry then fall back tier; inference errors retry once; user sees the active model + clear error in popup.

**Rationale:** Device diversity requires intelligent selection. Single engine owner prevents duplicate loads + memory blow-ups.

### VI. LinkedIn Integration Resilience
LinkedIn's UI changes frequently. Our integration must be resilient to DOM structure changes.

**Target Selectors (Defensive):**
- Multiple fallback selectors per element type
- Feature detection over assumption
- Avoid brittle XPath or deep nesting
- Parsers return typed error objects on missing elements, never throw uncaught
- Popup surfaces a "parse-failure" chip when a parser logs a recent failure

**Integration Principles:**
- Test with LinkedIn's A/B test variations via fixture HTMLs
- Never break LinkedIn's native functionality
- Clean up injected elements on navigation

**Rationale:** LinkedIn updates break extensions. Defensive coding + typed parse failures keep users informed instead of silently degraded.

### VII. Service Worker Lifecycle (NON-NEGOTIABLE)
MV3 service workers are suspended after ~30s idle. Any flow that depends on a long-running background operation MUST account for this.

**Requirements:**
- Operations expected to exceed 25s (model cold-load, SSI capture round-trip, profile capture inference) MUST either:
  - Use `chrome.alarms` to resume on next tick, OR
  - Maintain an explicit keep-alive ping (e.g., periodic `chrome.runtime.getPlatformInfo`) until completion
- Async message handlers MUST return `true` from `onMessage` listeners that respond asynchronously
- `engineInitialized` state MUST be re-checked on every wake-up; never assume in-memory state persisted
- Daily-alarm orchestrations (e.g., SSI capture) MUST persist enough state to chrome.storage to resume after suspension

**Rationale:** "It worked locally" but failed in production because the SW died mid-operation is the single most common MV3 bug. Codify the patterns.

### VIII. LinkedIn DOM Capture Hygiene
Test fixtures captured from real LinkedIn pages MUST be anonymized before commit.

**Requirements:**
- Replace `data-urn`, `data-id`, and any LinkedIn-issued identifier with synthetic placeholders (`urn:li:activity:PLACEHOLDER_001`)
- Replace real names, headlines, About text, and post bodies with synthetic equivalents that preserve length + structure
- Strip embedded JSON-LD blobs and inline `<script>` payloads
- Comment at top of every fixture file: `<!-- Captured YYYY-MM-DD; anonymized; safe to commit -->`
- Diff review before commit: `git diff` MUST surface no remaining real names, real LinkedIn URLs, or real numeric IDs

**Rationale:** A test fixture committed once is a leak forever. The repo is public.

## Technical Stack Requirements

### Core Technologies (LOCKED)
- **Runtime**: Chrome Extension Manifest V3
- **Language**: TypeScript (strict mode, ES2020 target)
- **AI Library**: `@mlc-ai/web-llm` (locked minor; see `package.json`)
- **Build System**: Parcel 2.x with `@parcel/config-webextension`
- **Test Framework**: Jest with ts-jest and jsdom
- **Linting**: ESLint with `@typescript-eslint/parser` (must cover `.ts`)
- **Formatting**: Prettier (enforced)

### Dependency Management
- Lock versions for AI libraries (WebLLM minor pin)
- Use caret (^) for dev dependencies only
- Security audit before updates: `npm audit`
- Test model compatibility after WebLLM updates
- Document breaking changes in CHANGELOG.md

### Performance Budgets

| Surface | Budget |
|---|---|
| Extension size (excluding models) | < 5 MB |
| Popup main tab — time-to-interactive | < 100 ms |
| Popup heavy tabs (SSI dashboard w/ Chart.js, 90 snapshots) | < 500 ms |
| Content-script button injection | < 50 ms after DOM ready |
| Fast-tier inference | < 2 s |
| Professional-tier inference | < 10 s |
| WebLLM heap | warn > 2 GB |
| chrome.storage.local total | < 5 MB (quota is 10, leave headroom) |

### Security Standards
- **CSP**: Strict, only `wasm-unsafe-eval` for WebLLM; explicit allow-list for HuggingFace CDNs
- **Permissions**: Exactly the set in Principle IV
- **Secrets**: No API keys, tokens, or credentials in code
- **XSS Prevention**: Sanitize all LinkedIn-sourced content before display
- **Injection Safety**: Prefer `textContent` over `innerHTML`

## Development Workflow

### Implementation Cycle
1. **Specify**: Write failing tests (per Principle III)
2. **Implement**: Minimal code to pass
3. **Quality**: All gates green locally (Principle II)
4. **Validate**: Manual test in actual LinkedIn environment for DOM-touching changes
5. **Document**: Update CLAUDE.md only if architecture changed

### Build Pipeline (`scripts/build.sh`)
1. validate_dependencies
2. type-check
3. lint (0 warnings)
4. test:ci
5. (parallel tsc compile to `dist/` — separate from Parcel)
6. copy_static_assets (manifest, html, css, icons)
7. validate_manifest
8. report_build_size

### Release Process
1. `./scripts/version-bump.sh --type {patch|minor|major}` — bumps `package.json` + `src/manifest.json`, commits, tags
2. `npm run build:script`
3. `npm run package`
4. Load unpacked, smoke-test
5. `git push --tags` → GitHub Actions builds + releases
6. Manual Chrome Web Store upload

## Governance

### Constitution Authority
This constitution supersedes all other development practices, guidelines, or conventions. Feature specs (`specs/*/spec.md`) inherit it; they MAY tighten constraints but MUST NOT widen them.

### Amendment Process
1. Propose amendment with rationale (PR or issue)
2. Document impact on existing code, specs, and templates
3. Maintainer approval
4. Bump `Version`, set `Last Amended`, write Sync Impact Report at top
5. Update CLAUDE.md if architectural changes
6. Update or annotate affected feature specs

### Versioning
- **MAJOR**: Backward-incompatible removal or redefinition of a principle
- **MINOR**: New principle or materially expanded guidance
- **PATCH**: Wording/typo/example fix, no behavioral change

### Compliance Verification
- **All PRs**: Reviewers cite which principles apply; CI enforces Principle II gates
- **Spec audits**: Every feature spec gets a Constitution Check section (see `specs/*/plan.md`)
- **Critical violations** (privacy breach, auto-submit to LinkedIn) trigger immediate rollback

### Runtime Guidance
For day-to-day development questions, consult CLAUDE.md. For architectural decisions or principle interpretation, reference this constitution.

**Version**: 1.1.0 | **Ratified**: 2025-10-13 | **Last Amended**: 2026-05-14
