# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReplyMate is a privacy-focused Chrome extension (Manifest V3) that generates LinkedIn reply suggestions. All inference runs on-device via WebLLM — nothing leaves the browser.

## Commands

### Build / Dev
- `npm run dev` — Parcel watch mode against `src/manifest.json` (`@parcel/config-webextension`). Output → `dist/`.
- `npm run build` — Parcel production build.
- `npm run build:script` — Full quality-gated build via `./scripts/build.sh` (type-check → lint → `test:ci` → `tsc` → copy assets → manifest validate → size report). Note: this also runs a parallel `tsc` compile to `dist/`, which is separate from the Parcel pipeline.
- `npm run clean` — Wipes `dist/`, `packages/`, `.parcel-cache/`.
- `npm run package` / `npm run zip` — `./scripts/package.sh` ZIPs prod + dev builds.
- `./scripts/version-bump.sh --type {patch|minor|major|custom --version X.Y.Z}` — Bumps `package.json` + `src/manifest.json`, commits, tags.

### Test
- `npm test` — Jest (ts-jest + jsdom), config in `jest.config.js`, setup in `tests/setup.ts` (Chrome API mocks).
- `npm test -- <file-or-pattern>` — Single file.
- `npm test -- --testNamePattern="<regex>"` — By test name.
- `npm test -- --testPathIgnorePatterns=linkedin-integration` — Skip the integration suite (known flaky in some envs).
- `npm run test:coverage` / `npm run test:ci`.

### Quality (must pass before commit)
- `npm run lint` — ESLint on `src/**/*.js` only (max-warnings=0). TS files are not in the default lint script; rely on `type-check` for `.ts`.
- `npm run type-check` — `tsc --noEmit` with strict mode.
- `npm run format` / `npm run format:check` — Prettier across `src/**/*.{ts,js,css,html,json}`.

## Architecture

### Runtime topology
```
LinkedIn page  ──► linkedin-content.ts ──┐
                                          │  chrome.runtime messages
popup.html ──► popup.ts ─────────────────┤
                                          ▼
                                  background.ts (service worker, type: module)
                                          │
                                          ▼
                                  model-loader.ts (OptimizedModelLoader singleton)
                                          │
                                          ▼
                                  @mlc-ai/web-llm  →  WebGPU / WASM
```

### Critical files
- `src/background.ts` — Service worker. Owns the AI engine lifecycle (`ensureEngine`), device-tier model selection (`getOptimalBackgroundModel`), prompt assembly (`DEFAULT_PROMPTS` + `FEW_SHOT_EXAMPLES`), reply validation (`validateReplyQuality`), and performance telemetry. Broadcasts model-load progress to all tabs.
- `src/model-loader.ts` — Singleton wrapper around `CreateMLCEngine` with retry, timeout, preload queue, and a per-model loading-state map. Background always goes through this — do not call `CreateMLCEngine` directly elsewhere.
- `src/linkedin-content.ts` — `LinkedInReplyMate` class. Mutation-observes the feed, injects "Generate Reply" buttons, extracts post + top-comment text, and pings the worker with `linkedinContentScriptReady` on startup so the worker can warm the engine.
- `src/popup.ts` + `popup.html` / `popup.css` — Extension popup: model picker, custom-prompt editor, temperature / max-token sliders, manual chat.

### Model tiers (background)
Device-capability gated in `getOptimalBackgroundModel`:
- ≥8 GB RAM and ≥8 cores → `Llama-3.2-3B-Instruct-q4f16_1-MLC`
- ≥4 GB RAM or ≥4 cores → `Llama-3.2-1B-Instruct-q4f16_1-MLC`
- otherwise → `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`

`model-loader.ts` preloads `MODEL_PRIORITIES`-tagged `'high'` models (Qwen2.5-0.5B, Phi-3.5-mini) opportunistically.

### Message contract (`chrome.runtime.sendMessage` actions)
- `generateReply` — content script → background (with `postId`, `postContent`, optional comments). Background streams back the reply.
- `linkedinContentScriptReady` — content script → background, triggers engine warm-up.
- `getModelsInfo` / `testModel` / `resetModel` — popup → background.
- `modelLoadProgress` — background → all tabs (broadcast), fields: `progress`, `message`, `stage` (`initializing` | `downloading` | `loading` | `finalizing` | `complete`), `isFirstLoad`.

### Storage keys
- `chrome.storage.sync` — `customPrompts` (object: `{ withComments, standard }`), `aiTemperature` (default 0.85), `aiMaxTokens` (default 150), `selectedModel`.
- `chrome.storage.local` — `model-<modelId>-cached` flag, `performanceMetrics` (rolling last 100), `hasUsedExtension`.

### Manifest essentials (`src/manifest.json`)
- Permissions: `storage`, `tabs`, `activeTab`, `windows`, `alarms`.
- Host permissions: `https://*.linkedin.com/*`.
- Content script runs at `document_idle` on LinkedIn only.
- CSP allows `wasm-unsafe-eval` and Hugging Face / `huggingface.co` CDNs for model fetches — keep this in sync when adding new model hosts.

## LinkedIn integration notes
Post detection relies on `div[data-id]` containers; reply textareas are `div[contenteditable="true"]`. LinkedIn's DOM shifts often — when buttons stop appearing, check the mutation observer selectors in `linkedin-content.ts` first.

## Conventions
- TypeScript strict mode is non-negotiable; `any` should be justified.
- The optimized model loader is the single entry point for engine creation — don't bypass it.
- `validateReplyQuality` scores 0–100 and gates retries; preserve its rules (length, no preambles, no generic praise) when changing prompts.
- Tests use Chrome API mocks from `tests/setup.ts`; new chrome.* usage may need a mock there.
