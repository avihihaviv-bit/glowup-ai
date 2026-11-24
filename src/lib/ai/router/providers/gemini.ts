import { ProviderError } from "../errors";
import { jsonSchemaOf, schemaInstruction } from "../json";
import type { CallContext, JsonMode, ObjectRequest, Part, ProviderAdapter, StreamHandle, StreamRequest, Usage } from "../types";
import { call, readJson, sse } from "./http";

type GPart = { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } };
type GResp = {
  candidates?: { content?: { parts?: GPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { code?: number; message?: string; status?: string };
};

const BLOCKED = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

function toParts(parts: Part[]): GPart[] {
  return parts.map((p) => (p.type === "text" ? { text: p.text } : { inlineData: { mimeType: p.mediaType, data: p.data } }));
}
const usageOf = (r: GResp): Usage | undefined =>
  r.usageMetadata ? { inputTokens: r.usageMetadata.promptTokenCount, outputTokens: (r.usageMetadata.candidatesTokenCount ?? 0) + (r.usageMetadata.thoughtsTokenCount ?? 0) } : undefined;

function check(r: GResp): string {
  if (r.promptFeedback?.blockReason) throw new ProviderError("refusal", `blocked: ${r.promptFeedback.blockReason}`);
  const c = r.candidates?.[0];
  if (!c) throw new ProviderError("invalid_output", "no candidates returned");
  if (c.finishReason && BLOCKED.has(c.finishReason)) throw new ProviderError("refusal", `blocked: ${c.finishReason}`);
  if (c.finishReason === "MAX_TOKENS") throw new ProviderError("invalid_output", "response truncated (max tokens)");
  return (c.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
}

export function geminiAdapter(baseUrl: string): ProviderAdapter {
  const headers = (key: string) => ({ "Content-Type": "application/json", "x-goog-api-key": key });
  return {
    id: "gemini",
    label: "Google Gemini",
    jsonModes: ["native", "object", "prompt"],

    async listModels(key, signal) {
      const res = await call(`${baseUrl}/models?pageSize=1000`, { headers: headers(key) }, signal);
      const d = (await readJson(res)) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      return (d.models ?? [])
        .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => ({ id: m.name.replace(/^models\//, "") }));
    },

    async generateObject(req: ObjectRequest, ctx: CallContext, mode: JsonMode) {
      const sys = req.system + (mode === "native" ? "" : schemaInstruction(req.schema)) + (req.repairNote ?? "");
      const body = {
        systemInstruction: { parts: [{ text: sys }] },
        contents: [{ role: "user", parts: toParts(req.parts) }],
        generationConfig: {
          maxOutputTokens: 32768,
          ...(mode !== "prompt" && { responseMimeType: "application/json" }),
          ...(mode === "native" && { responseJsonSchema: jsonSchemaOf(req.schema) }),
        },
      };
      const res = await call(`${baseUrl}/models/${encodeURIComponent(ctx.model.id)}:generateContent`, { method: "POST", headers: headers(ctx.key), body: JSON.stringify(body) }, ctx.signal);
      const r = (await readJson(res)) as GResp;
      return { text: check(r), usage: usageOf(r) };
    },

    async stream(req: StreamRequest, ctx: CallContext): Promise<StreamHandle> {
      const body = {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { maxOutputTokens: req.maxTokens ?? 8000 },
      };
      const res = await call(`${baseUrl}/models/${encodeURIComponent(ctx.model.id)}:streamGenerateContent?alt=sse`, { method: "POST", headers: headers(ctx.key), body: JSON.stringify(body) }, ctx.signal);
      let usage: Usage | undefined;
      let resolveDone!: (v: { usage?: Usage }) => void;
      let rejectDone!: (e: unknown) => void;
      const done = new Promise<{ usage?: Usage }>((a, b) => ((resolveDone = a), (rejectDone = b)));
      done.catch(() => {});
      async function* chunks() {
        try {
          for await (const data of sse(res)) {
            const r = JSON.parse(data) as GResp;
            if (r.error) throw new ProviderError(r.error.code === 429 ? "rate_limit" : "server", r.error.message ?? "stream error", { status: r.error.code });
            if (r.promptFeedback?.blockReason) throw new ProviderError("refusal", `blocked: ${r.promptFeedback.blockReason}`);
            const c = r.candidates?.[0];
            if (c?.finishReason && BLOCKED.has(c.finishReason)) throw new ProviderError("refusal", `blocked: ${c.finishReason}`);
            usage = usageOf(r) ?? usage;
            const text = (c?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join("");
            if (text) yield text;
          }
          resolveDone({ usage });
        } catch (e) {
          rejectDone(e);
          throw e;
        }
      }
      return { chunks: chunks(), done, abort: () => res.body?.cancel().catch(() => {}) };
    },
  };
}
