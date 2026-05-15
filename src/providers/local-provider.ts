/**
 * v0.5.0 — Local WebLLM provider.
 *
 * Wraps the existing MLCEngine streaming completion API behind the
 * InferenceProvider interface. Streaming chunks are concatenated server-
 * side (here, "server-side" = service worker) and returned as a single
 * trimmed string so the caller doesn't need to know we streamed.
 *
 * isCloud=false — this provider satisfies Constitution v1.1+ §I
 * (Privacy-First, all inference on-device).
 */

import type { MLCEngineInterface, ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import type { InferenceParams, InferenceProvider } from './inference-provider';

export type EnsureEngineFn = () => Promise<MLCEngineInterface>;

export class LocalProvider implements InferenceProvider {
  readonly name = 'WebLLM (local)';
  readonly isCloud = false;

  constructor(private readonly ensureEngine: EnsureEngineFn) {}

  async generate(params: InferenceParams): Promise<string> {
    const engine = await this.ensureEngine();
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: params.system },
      { role: 'user', content: params.user },
    ];
    let text = '';
    const completion = await engine.chat.completions.create({
      stream: true,
      messages,
      max_tokens: params.maxTokens ?? 150,
      temperature: params.temperature ?? 0.85,
      top_p: params.topP ?? 0.9,
      stop: params.stop,
    });
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) text += delta;
    }
    return text.trim();
  }
}
