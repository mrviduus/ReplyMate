# Changelog

All notable changes to ReplyMate are documented here. Format roughly follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — v0.4.0 SSI Growth Mode

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
