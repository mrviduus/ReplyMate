/**
 * v0.5.0 — LocalProvider spec. Mocks MLCEngine streaming completion.
 */

import { LocalProvider } from '../../src/providers/local-provider';
import type { MLCEngineInterface } from '@mlc-ai/web-llm';

function makeMockEngine(deltas: string[]): MLCEngineInterface {
  const completion = {
    async *[Symbol.asyncIterator]() {
      for (const d of deltas) {
        yield { choices: [{ delta: { content: d } }] };
      }
    },
  };
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(completion),
      },
    },
  } as unknown as MLCEngineInterface;
}

describe('LocalProvider', () => {
  it('reports isCloud=false and a human-readable name', () => {
    const p = new LocalProvider(async () => makeMockEngine([]));
    expect(p.isCloud).toBe(false);
    expect(p.name.toLowerCase()).toContain('local');
  });

  it('concatenates streamed deltas into one trimmed string', async () => {
    const engine = makeMockEngine(['Hello ', 'world', '!']);
    const p = new LocalProvider(async () => engine);
    const out = await p.generate({ system: 's', user: 'u' });
    expect(out).toBe('Hello world!');
  });

  it('passes system + user messages to engine in correct order', async () => {
    const engine = makeMockEngine(['x']);
    const p = new LocalProvider(async () => engine);
    await p.generate({ system: 'SYS', user: 'USR' });
    const createCall = (engine.chat.completions.create as jest.Mock).mock.calls[0][0];
    expect(createCall.messages).toEqual([
      { role: 'system', content: 'SYS' },
      { role: 'user', content: 'USR' },
    ]);
    expect(createCall.stream).toBe(true);
  });

  it('forwards maxTokens / temperature / topP / stop when provided', async () => {
    const engine = makeMockEngine(['x']);
    const p = new LocalProvider(async () => engine);
    await p.generate({
      system: 's',
      user: 'u',
      maxTokens: 99,
      temperature: 0.31,
      topP: 0.42,
      stop: ['\n\n'],
    });
    const createCall = (engine.chat.completions.create as jest.Mock).mock.calls[0][0];
    expect(createCall.max_tokens).toBe(99);
    expect(createCall.temperature).toBeCloseTo(0.31);
    expect(createCall.top_p).toBeCloseTo(0.42);
    expect(createCall.stop).toEqual(['\n\n']);
  });

  it('applies sensible defaults when params omitted', async () => {
    const engine = makeMockEngine(['x']);
    const p = new LocalProvider(async () => engine);
    await p.generate({ system: 's', user: 'u' });
    const createCall = (engine.chat.completions.create as jest.Mock).mock.calls[0][0];
    expect(createCall.max_tokens).toBe(150);
    expect(createCall.temperature).toBeCloseTo(0.85);
    expect(createCall.top_p).toBeCloseTo(0.9);
  });

  it('returns empty string when the stream emits nothing', async () => {
    const engine = makeMockEngine([]);
    const p = new LocalProvider(async () => engine);
    await expect(p.generate({ system: '', user: '' })).resolves.toBe('');
  });
});
