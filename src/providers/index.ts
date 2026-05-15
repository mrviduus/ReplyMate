/**
 * v0.5.0 — Provider factory.
 *
 * Single entry point for callers in background.ts. Reads provider config
 * from storage, returns the active InferenceProvider. Falls back to local
 * (Constitution v1.2 §I default) on any misconfiguration.
 */

import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { getProviderConfig } from '../storage-schema';
import type { ProviderConfig } from '../storage-schema';
import type { InferenceProvider } from './inference-provider';
import { LocalProvider } from './local-provider';
import { OpenAIProvider } from './openai-provider';

export type { InferenceProvider, InferenceParams } from './inference-provider';
export { LocalProvider } from './local-provider';
export { OpenAIProvider } from './openai-provider';

export interface ProviderFactoryDeps {
  /** Lazy WebLLM engine getter (background.ts owns the actual instance). */
  ensureLocalEngine: () => Promise<MLCEngineInterface>;
}

/**
 * Build the active provider from stored config.
 * - mode='openai' AND apiKey present AND model present → OpenAIProvider
 * - anything else → LocalProvider (safe default)
 */
export async function getActiveProvider(deps: ProviderFactoryDeps): Promise<InferenceProvider> {
  const cfg = await getProviderConfig();
  return buildProvider(cfg, deps);
}

/** Pure: build provider from an explicit config. Used in tests + getActiveProvider. */
export function buildProvider(cfg: ProviderConfig, deps: ProviderFactoryDeps): InferenceProvider {
  if (cfg.mode === 'openai' && cfg.openai?.apiKey && cfg.openai?.model) {
    return new OpenAIProvider({
      apiKey: cfg.openai.apiKey,
      model: cfg.openai.model,
      baseUrl: cfg.openai.baseUrl,
    });
  }
  return new LocalProvider(deps.ensureLocalEngine);
}
