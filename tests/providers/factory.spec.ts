/**
 * v0.5.0 — Provider factory spec.
 */

import { buildProvider } from '../../src/providers';
import { LocalProvider } from '../../src/providers/local-provider';
import { OpenAIProvider } from '../../src/providers/openai-provider';
import type { ProviderConfig } from '../../src/storage-schema';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';

const fakeDeps = {
  ensureLocalEngine: async () => ({}) as MLCEngineInterface,
};

describe('buildProvider', () => {
  it('mode=local → LocalProvider', () => {
    const p = buildProvider({ mode: 'local' }, fakeDeps);
    expect(p).toBeInstanceOf(LocalProvider);
    expect(p.isCloud).toBe(false);
  });

  it('mode=openai with full config → OpenAIProvider', () => {
    const cfg: ProviderConfig = {
      mode: 'openai',
      openai: { apiKey: 'sk-xx', model: 'gpt-4o-mini' },
    };
    const p = buildProvider(cfg, fakeDeps);
    expect(p).toBeInstanceOf(OpenAIProvider);
    expect(p.isCloud).toBe(true);
  });

  it('mode=openai but missing apiKey → falls back to LocalProvider', () => {
    const cfg: ProviderConfig = {
      mode: 'openai',
      openai: { apiKey: '', model: 'gpt-4o-mini' },
    };
    const p = buildProvider(cfg, fakeDeps);
    expect(p).toBeInstanceOf(LocalProvider);
  });

  it('mode=openai but missing model → falls back to LocalProvider', () => {
    const cfg: ProviderConfig = {
      mode: 'openai',
      openai: { apiKey: 'sk-xx', model: '' },
    };
    const p = buildProvider(cfg, fakeDeps);
    expect(p).toBeInstanceOf(LocalProvider);
  });

  it('mode=openai with no openai object → falls back to LocalProvider', () => {
    const cfg: ProviderConfig = { mode: 'openai' };
    const p = buildProvider(cfg, fakeDeps);
    expect(p).toBeInstanceOf(LocalProvider);
  });
});
