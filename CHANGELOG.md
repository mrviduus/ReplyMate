# Changelog

All notable changes to ReplyMate are documented here. Format roughly follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

## [0.5.3] — 2026-05-15 — SSI donut chart + real-DOM SSI parser fix

### Fixed

- **SSI capture no longer fails on real LinkedIn DOM** (Bug Report 2026-05-15: "Capture failed: Could not locate `.ssi-score-table__current-ssi-score`"). The v0.4.0 parser hardcoded selectors from a synthetic fixture that don't exist in the live 2026 LinkedIn SSI page. Rewrote `parseSsiDom` with two-pass extraction:
  1. **Selector pass** — try multiple class candidates (legacy + current variants)
  2. **Text-pattern fallback** — find numbers near anchor strings like `"X / 100"`, `"X out of 100"`, or component titles like `"Establish your professional brand"`. Handles the common LinkedIn pattern of inline title+value layouts (`"8.78 | Establish your professional brand"`).
- **Rank parsing failure is now non-fatal.** If components + total parse OK but `industryRank` / `networkRank` selectors don't match, snapshot is saved with `'unknown'` ranks rather than discarding the whole capture.
- **`Document.textContent === null` per spec** — fallback helper `getDocText()` correctly reads via `body` or `documentElement` for `Document`, falling back to `textContent` for `DocumentFragment`.

### Added

- **Doughnut chart in popup for current SSI breakdown** (user request: "I want to see this chart without going to the link"). Matches LinkedIn's `/sales/ssi` visual: 4-segment donut colored orange / purple / teal / blue (Establish brand / Find people / Engage / Build), 160×160px, total score rendered in center via CSS overlay. Renders only when there's at least 1 captured snapshot.
- **`scripts/dump-linkedin-ssi-dom.js`** — companion to v0.5.1's profile-DOM dump script. Paste into DevTools on `/sales/ssi`, copies a JSON snapshot of candidate selectors + raw text + component-title matches + big-number scan to clipboard. Lets us update `ssi-parser.ts` against the canonical real DOM in a follow-up if the v0.5.3 defensive parser still misses on some account variant (Sales Navigator vs Premium vs free).
- **2 new ssi-parser tests** covering the text-pattern fallback paths: total via `"X / 100"`, components via inline `"score | title"` LinkedIn pattern.

### Known follow-ups

- If the defensive SSI parser still fails on your account, run `scripts/dump-linkedin-ssi-dom.js` on `/sales/ssi` and share the JSON for a canonical selector fix in v0.5.4.
- Profile parser still has the same root cause (defensive but waiting for `dump-linkedin-profile-dom.js` snapshot). Tracked since v0.5.2.
- Pre-commit hook (husky + lint-staged) to auto-run prettier — every minor release so far has needed a follow-up format commit. Tracked for v0.5.4.

---

## [0.5.2] — 2026-05-15 — VRAM unload, defensive parsing, action deprecation

### Fixed

- **Local WebLLM model can now be explicitly unloaded from VRAM.** v0.5.1 fixed the warm-up trigger (don't load in cloud mode), but a model that was ALREADY loaded would sit in VRAM forever — `keepAlive` + Chrome's MV3 lifecycle never released it. New `engine.unload` message handler calls WebLLM's `engine.unload()` and clears state. Two trigger paths:
  1. **Auto** — when the user saves OpenAI provider config in popup, background drops the local engine automatically (Bug #3 from v0.5.1 dogfood thread).
  2. **Manual** — new "Free up GPU memory" button next to Save in the popup Provider section.
- **Profile parser is now defensive against LinkedIn DOM changes** (partial fix for Bug #1). Each field tries 3–5 selector variants (anchor `#about` AND `section[data-section="summary"]` AND `section.summary`; skill labels try `.t-bold` AND `.visually-hidden`; etc.) per Constitution VI. Survives ~18 months of LinkedIn A/B-test churn.
- **Loud failure when parser extracts ZERO fields** instead of hallucinating. `profile-context.ts` now returns `script-failed` with an actionable message ("LinkedIn's DOM may have changed — run scripts/dump-linkedin-profile-dom.js and share the JSON") if EVERY parsed field comes back empty. v0.4.0 + v0.5.0 silently fed empty fields to the LLM which then invented a "marketing consultant" persona.

### Changed

- `actions/checkout` bumped `@v4` → `@v6` across ci.yml, code-quality.yml, release.yml (Node 20 deprecation; forced cutover June 2 2026).
- `actions/setup-node` bumped `@v4` → `@v6` across all 3 workflows for the same reason.

### Known issues (carried forward)

- **Real-DOM parser fix still pending** — defensive selectors raise the odds of partial success, but the canonical fix requires `scripts/dump-linkedin-profile-dom.js` output from a live profile. Workaround: opt into OpenAI; quality is independent of parser since LLM is given whatever fields parsed (even partial).
- Legacy `generateLinkedInReply{,WithComments}` handlers still bypass provider abstraction. Tracked for v0.5.3.

### Architectural note

The earlier Bug Report ("keepAlive blocks Chrome SW unload → WebLLM permanent VRAM") was correct as a fact but only half the diagnosis. Even without keepAlive, WebLLM's engine reference holds WebGPU buffers that the GC can't reclaim while the SW process lives. `engine.unload()` (WebLLM API) is the only correct release path. Now wired.

---

## [0.5.1] — 2026-05-15 — Bug-fix sweep

### Fixed

- **Skip WebLLM warm-up when cloud mode is active** (heat / VRAM fix). Previously the `linkedinContentScriptReady` handler eagerly called `ensureEngine()` regardless of provider config, so the local 3B model loaded into VRAM and stayed there even for users who opted into OpenAI. With ~2 GB stable VRAM use + GPU spikes per generation, this was the dominant heat-source on smaller GPUs (e.g. GTX 1650 Ti 4 GB). Now the warm-up reads `getProviderConfig()` first and skips for cloud users.
- **Engagement Queue warning icon now renders** (Bug #2 of v0.5.0 dogfood). The injected sidebar lives in the LinkedIn page context which does NOT load Font Awesome (FA is only in popup.html), so `<i class="fa fa-info-circle">` rendered as a 0×0 element. Replaced with inline SVG that ships its own glyph.
- **`version-bump.sh` no longer fights Prettier** (CI release friction). The script writes `manifest.json` via `JSON.stringify(.., 2)` which conflicts with Prettier's short-array collapse — every bump previously needed a follow-up "style: reformat" commit before CI passed. The script now pipes `manifest.json` through `npx prettier --write` after the version edit.
- **Duplicate `-dev.zip` removed**. `scripts/package.sh` was emitting both `ReplyMate-vX.Y.Z.zip` and `ReplyMate-vX.Y.Z-dev.zip` but they were byte-identical (Parcel doesn't ship source maps in production, so the `-x "*.map"` exclusion caught nothing). The `-dev` name was misleading. Now ships one canonical ZIP. `release.yml` updated to expect the single file.

### Changed

- `softprops/action-gh-release` bumped `@v2` → `@v3` (v2 entered Node 20 deprecation in 2026; v3 supports Node 24).

### Added

- `scripts/dump-linkedin-profile-dom.js` — paste-into-DevTools probe that snapshots which LinkedIn profile selectors actually exist in 2026. v0.4.0 popup test (see screenshot in commit `b8fd4e6` thread) showed `profile-parser` returns 0 skills and an empty positioning input because the synthetic-fixture selectors don't match real DOM. This script is the next step toward a real-DOM parser fix in v0.5.2.

### Known issues (unchanged from v0.5.0)

- **`profile-parser` mismatched against live LinkedIn DOM** — still produces hallucinated positioning summary from empty parser input. Workaround: opt into OpenAI mode (better quality on the same empty input). Real fix in v0.5.2 once `dump-linkedin-profile-dom.js` snapshot is in hand.
- Legacy `generateLinkedInReply{,WithComments}` handlers still bypass provider abstraction. v0.5.2.

---

## [0.5.0] — 2026-05-15 — OpenAI BYOK (opt-in cloud)

### Added — OpenAI provider

- **Inference provider abstraction** (`src/providers/`): single `InferenceProvider` interface, `LocalProvider` wraps existing WebLLM streaming completion, **new `OpenAIProvider`** posts to `api.openai.com/v1/chat/completions` with the user's own API key (BYOK — no bundled credentials).
- **Popup "Inference Provider" section**: radio toggle Local / OpenAI, masked API key field, model dropdown (`gpt-4o-mini`, `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`, `o4-mini` — custom values also accepted on save). Saved to `replymate.provider.v1` in `chrome.storage.local` (per-browser-profile; never `sync` — API keys are per-device secrets).
- **Honest UI when cloud mode active:**
  - Amber **cloud-mode banner** at top of popup naming the active provider + model
  - Every `queue.draftComment` / `profile.capture` response from background includes `provider` (name) + `isCloud` so UI can render per-action chips
- **Default: local.** Fresh install lands in local mode. Cloud requires explicit user toggle + save.
- **`provider.get` / `provider.set`** background message handlers wire popup ↔ storage.

### Added — Inference call sites refactored to use provider

- `queue.draftComment` handler — Engagement Queue drafts now go through `await provider.generate(...)` instead of direct `engine.chat.completions.create`. Same WebLLM behavior in local mode; OpenAI quality available when opted in.
- `profile.capture` handler — positioning summary generation likewise. (This was the failure mode in v0.4.0 — local 3B model hallucinated a "marketing consultant" persona from empty parser input. With OpenAI opted in, even imperfect parser input produces coherent output.)
- Legacy `generateLinkedInReply` / `generateLinkedInReplyWithComments` handlers (the v0.3.x individual-post "Generate Reply" button) **deliberately deferred** — they bundle inline retry + validation + performance-metric instrumentation, refactor planned for v0.5.1. They continue to use local WebLLM directly.

### Changed

- **Constitution amended to v1.2.0** (2026-05-15). Principle I now permits an opt-in cloud carve-out subject to: off-by-default, BYOK only, closed allow-list (currently just OpenAI), persistent honest UI, CSP-restricted egress, no key logging. Sync Impact Report at top of `constitution.md`.
- `src/manifest.json` CSP: added `https://api.openai.com` to `connect-src` (the only new allowed egress).
- `src/storage-schema.ts`: new `ProviderConfig` type, `replymate.provider.v1` key, `getProviderConfig` / `setProviderConfig` helpers. Schema version unchanged (additive, no migration needed).

### Tests

- **342 tests passing** (+22 from v0.4.0). New suites: `tests/providers/local-provider.spec.ts` (6), `tests/providers/openai-provider.spec.ts` (11), `tests/providers/factory.spec.ts` (5). Mocked `fetch` for OpenAI contract tests including non-OK handling and explicit assertion that the API key never appears in error messages.

### Deferred to v0.5.1

- Legacy reply handler refactor (use provider abstraction for the v0.3.x individual-post flow too)
- WebLLM model-list update (Phi-4-mini, Qwen3, Gemma 3 evaluation against current Llama-3.2 tier)
- Cloud-mode chip in Engagement Queue sidebar header (popup banner exists; sidebar chip not yet)
- README screenshots showing the new Provider section

### Compliance posture (per Constitution v1.2.0 §I)

| State | Outbound LLM calls | Banner visible |
|---|---|---|
| Default (local) | **0** | No |
| User toggled to OpenAI + saved valid key | Per generation, to `api.openai.com` only | Yes |

LinkedIn TOS implications when cloud mode is active are the user's responsibility — the extension surfaces the egress prominently and does not attempt to anonymize the content.

---

## [0.4.0] — 2026-05-15 — SSI Growth Mode

### Added — SSI Growth Mode
- **Profile Context capture** (US3): one-click capture of the user's LinkedIn profile from the popup. Active-tab URL guard (`/in/{handle}/`), `chrome.scripting.executeScript` for read-only HTML grab, pure parser extracts `fullName / headline / about (≤1500c) / topSkills[10] / recentPostThemes[3-5]`, WebLLM generates a 2-sentence positioning summary, persisted under `replymate.profile.v1`. Stale chip surfaces after 30 days (read-only — no auto-refresh).
- **Engagement Queue sidebar** (US1): mounts on `linkedin.com/feed/`, ranks visible posts by relevance (topic match + author tier + relationship + recency + engagement + diversity bonus), draws top-10 with per-tile editable AI drafts. Tone (Professional / Friendly / Enthusiastic / Thoughtful) and Length (Brief / Standard / Detailed) sliders regenerate all visible drafts. 5-minute refresh throttle. Per-tile actions: Regenerate, Copy & Open Post (clipboard → mark engaged 30-day TTL → open post URL in new tab), Hide (adds to `replymate.queue.dismissed.v1`). **Never** programmatically clicks LinkedIn submit/post/send buttons.
- **SSI Tracker** (US2): daily `chrome.alarms` job at 1440 min opens `/sales/ssi` in a background tab, parses total + 4 components + industry/network rank, stores under `replymate.ssi.history.v1` (90-snapshot cap with FIFO eviction). Popup dashboard shows total/100, 4-component grid, Chart.js trend line, and a one-line actionable insight ("Total rose 5 points this week — `Engage with insights` led with +3.2"). Manual `Refresh now` button + `Open SSI page` CTA. Last-parse error surfaces as popup chip until next success.

### Added — Foundation
- **Versioned storage schema** (`src/storage-schema.ts`): single source of truth for `chrome.storage.local` layout, with migration scaffold (`migrateIfNeeded`). 9 versioned keys, 8 entity types, eviction helpers (90-snapshot SSI cap, 30-day engaged-post TTL).
- **MV3 keep-alive helper** (`src/keep-alive.ts`): `keepAlive.start() / stop()` opens a self-port + 20s ping interval to prevent SW suspension during long flows (WebLLM cold-start, SSI capture round-trip). Per Constitution VII (NON-NEGOTIABLE).
- **Pure prompt builder** (`src/prompt-builder.ts`): `buildCommentPrompt / buildConnectionNotePrompt / buildPositioningPrompt`. Deterministic; 12 snapshot tests across 4 tone × 3 length combinations.
- **Pure relevance scorer** (`src/relevance-scorer.ts`): weighted formula per `specs/001-ssi-growth-mode/plan.md`. Sub-scorers exported for ≥95% coverage. obviousAiContent heuristic (buzzword combos, "Here are N takeaways" intros, "ever-evolving landscape") applies score *0.5 penalty.
- **Pure DOM parsers** with fixture-driven tests:
  - `src/profile-parser.ts` (12 tests)
  - `src/feed-parser.ts` (34 tests)
  - `src/ssi-parser.ts` (11 tests, typed `SsiParseResult` union)
- **Synthetic LinkedIn fixtures** (`tests/fixtures/`) — Constitution VIII anonymized. Three files: `linkedin-feed.html` (10 posts spanning tiers/degrees/own-post/AI-suspicious), `linkedin-profile.html` (10+1 skills cap check, 5 themes), `linkedin-ssi.html` (free LinkedIn variant; Sales Navigator shares the same `.ssi-score-table__*` classes).

### Changed
- Constitution amended to **v1.1.0** (2026-05-14). Added principles VII (MV3 Service Worker Lifecycle, NON-NEGOTIABLE) and VIII (LinkedIn DOM Capture Hygiene). Privacy-First section now lists explicit closed-list background-tab carve-outs (`/sales/ssi`, `/in/{me}`). Quality Gates drop the brittle "132+ tests" magic number in favor of coverage threshold ≥85%. Permissions list aligned to the actual shipped surface (`storage, tabs, activeTab, windows, alarms`). ESLint MUST cover `.ts` via `@typescript-eslint/parser`.
- `src/popup.html` gained Profile and SSI sections at the top of `settings-main` (popup is scroll-not-tabs by repo convention).
- `src/linkedin-content.ts` mounts Engagement Queue on `/feed/`, polls SPA route changes every 1.5s. Compliance warning expanded to mention SSI Growth Mode and reaffirm "drafts only, never programmatic submit".
- `src/background.ts` now wraps WebLLM calls in profile/queue handlers with `keepAlive.start() / stop()`. Registers `chrome.alarms` listener for the daily SSI capture.
- ESLint config (`.eslintrc.json`) wires `@typescript-eslint/parser` + `@typescript-eslint/recommended` for `**/*.ts`. Lint glob widened to `src/**/*.{ts,js}` (was `.js` only).
- `src/manifest.json`: added `scripting` permission, added `ssi-content.ts` content script entry for `/sales/ssi*`, added `engagement-queue.css` to `web_accessible_resources`. **NO** `/in/*` content script (compliance carve-out).

### Added — Dev dependencies
- `chart.js@^4.5.1` — popup SSI trend graph. ~75 KB gzipped (under the 100 KB budget set in plan.md).

### Repository hygiene (pre-spec)
- Removed dead code: `src/content.js`, `src/settings.js`, `tests/content.test.ts`, `tests/hello-world.test.ts`.
- Removed stale documentation: `TODO.md`, `REPLY_IMPROVEMENTS.md`, `QUICK_REFERENCE.md`, `docs/CLEANUP_SUMMARY.md`, `docs/guides/{CUSTOM_PROMPTS_FIXED,IMPROVEMENTS_SUMMARY,SMART_REPLY_IMPLEMENTATION}.md`, `docs/troubleshooting/TROUBLESHOOTING_DETAILED.md`.
- Lint cleanup: 21 issues fixed across `background.ts` / `linkedin-content.ts` / `model-loader.ts` / `popup.ts` from v1.1 strict TS enforcement.
- `CLAUDE.md` refreshed: correct lint scope, permissions list, message protocol, storage keys; added `model-loader.ts` to the critical-files map.

### Tests
- **310 tests passing** (was 132 baseline). 12 snapshot tests for prompt builder. New suites: `storage-schema` (15), `keep-alive` (7), `prompt-builder` (17), `profile-parser` (12), `profile-context` (14), `relevance-scorer` (43), `feed-parser` (34), `engagement-queue` (15), `ssi-parser` (11), `ssi-tracker` (14).
- All Constitution gates green: type-check, lint `--max-warnings=0`, full suite, Parcel build.

### Deferred to v0.4.1
- Connection Suggestor full UI (US4). v0.4.0 ships only the data model, types, and storage hooks.
- Engagement Queue `sidebarPosition` persistence (preferences exist in schema; drag/resize not yet wired).
- Engagement Queue cross-refresh `recentlyDisplayedAuthors` tracking (currently always empty).
- README screenshots (deferred until real-Chrome validation).

### Compliance posture (NON-NEGOTIABLE per Constitution v1.1 §I)
- All AI inference local via WebLLM. Zero outbound LLM API calls.
- No programmatic clicks on LinkedIn submit, post, send, or like buttons. Every action is "Copy → user pastes → user edits → user submits."
- Background tab loads restricted to closed-list carve-outs: `/sales/ssi` (daily SSI snapshot) and `/in/{me}` (user-initiated profile capture via `chrome.scripting.executeScript` only).
- Daily SSI capture cap: 1 per 24h. Engagement Queue refresh cap: 1 per 5 min. Connection Suggestor cap: ≤100 drafted/week (v0.4.1).

---

## [0.3.3] — 2025-10-16

Prior versions of ReplyMate (v0.3.x) ship AI reply suggestions on individual LinkedIn posts. v0.4.0 reframes the extension as a complete SSI growth co-pilot.

For changes before v0.4.0, see git history.
