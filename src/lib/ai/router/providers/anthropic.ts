import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { classifyHttp, classifyThrown, ProviderError } from "../errors";
import type { CallContext, Effort, ObjectRequest, Part, ProviderAdapter, StreamHandle, StreamRequest, Tier } from "../types";

/** Server-side refusal fallback (unchanged from the original integration). */
export const FALLBACK = { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

const clients = new Map<string, Anthropic>();
function client(key: string, baseURL: string) {
  const id = `${baseURL}|${key}`;
  let c = clients.get(id);
  if (!c) {
    // The router owns retries/failover, so the SDK's own retries are off.
    c = new Anthropic({ apiKey: key, baseURL, maxRetries: 0, timeout: 120_000 });
    clients.set(id, c);
  }
  return c;
}

const EFFORT: Record<Tier, Effort> = { fast: "low", balanced: "medium", deep: "high" };

function toBlocks(parts: Part[]): Anthropic.Beta.Messages.BetaContentBlockParam[] {
  return parts.map((p) => (p.type === "text" ? { type: "text", text: p.text } : { type: "image", source: { type: "base64", media_type: p.mediaType, data: p.data } }));
}

function mapError(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new ProviderError("timeout", "attempt timed out");
  if (err instanceof Anthropic.APIUserAbortError) return new ProviderError("timeout", "aborted");
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError("network", "connection failed");
  if (err instanceof Anthropic.APIError && typeof err.status === "number") {
    const h = err.headers instanceof Headers ? err.headers : new Headers((err.headers as Record<string, string>) ?? {});
    return classifyHttp(err.status, err.message ?? "", h);
  }
  return classifyThrown(err);
}

export function anthropicAdapter(baseUrl: string): ProviderAdapter {
  return {
    id: "anthropic",
    label: "Anthropic Claude",
    jsonModes: ["native"],

    async generateObject(req: ObjectRequest, ctx: CallContext) {
      try {
        const res = await client(ctx.key, baseUrl).beta.messages.parse(
          {
            model: ctx.model.id,
            max_tokens: 16000,
            ...FALLBACK,
            system: req.system + (req.repairNote ?? ""),
            output_config: { effort: req.effort ?? EFFORT[req.tier], format: betaZodOutputFormat(req.schema) },
            messages: [{ role: "user", content: toBlocks(req.parts) }],
          },
          { signal: ctx.signal },
        );
        if (res.stop_reason === "refusal") throw new ProviderError("refusal", "model declined");
        if (res.stop_reason === "max_tokens") throw new ProviderError("invalid_output", "response truncated (max tokens)");
        if (!res.parsed_output) throw new ProviderError("invalid_output", "no parsed output");
        return { text: "", parsed: res.parsed_output, usage: { inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens } };
      } catch (err) {
        throw mapError(err);
      }
    },

    async stream(req: StreamRequest, ctx: CallContext): Promise<StreamHandle> {
      const stream = client(ctx.key, baseUrl).beta.messages.stream(
        {
          model: ctx.model.id,
          max_tokens: req.maxTokens ?? 8000,
          ...FALLBACK,
          output_config: { effort: req.effort ?? EFFORT[req.tier] },
          system: req.system,
          messages: req.messages,
        },
        { signal: ctx.signal },
      );
      let resolveDone!: (v: { usage?: { inputTokens?: number; outputTokens?: number }; refusal?: boolean }) => void;
      let rejectDone!: (e: unknown) => void;
      const done = new Promise<{ usage?: { inputTokens?: number; outputTokens?: number }; refusal?: boolean }>((a, b) => ((resolveDone = a), (rejectDone = b)));
      done.catch(() => {});
      async function* chunks() {
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
          }
          const final = await stream.finalMessage();
          resolveDone({ usage: { inputTokens: final.usage.input_tokens, outputTokens: final.usage.output_tokens }, refusal: final.stop_reason === "refusal" });
        } catch (err) {
          const e = mapError(err);
          rejectDone(e);
          throw e;
        }
      }
      return { chunks: chunks(), done, abort: () => stream.abort() };
    },
  };
}
