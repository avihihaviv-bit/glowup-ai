import { classifyHttp, ProviderError } from "../errors";
import { jsonSchemaOf, schemaInstruction } from "../json";
import type { CallContext, JsonMode, ObjectRequest, Part, ProviderAdapter, ProviderId, StreamHandle, StreamRequest, Usage } from "../types";
import { call, quotaFromHeaders, readJson, sse } from "./http";

type OAResp = {
  choices?: { message?: { content?: string | null; refusal?: string | null }; delta?: { content?: string | null }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  x_groq?: { usage?: { prompt_tokens?: number; completion_tokens?: number } };
  error?: { code?: number | string; message?: string; metadata?: unknown };
};

export interface OpenAICompatOptions {
  id: ProviderId;
  label: string;
  baseUrl: string;
  /** groq uses max_completion_tokens; openrouter max_tokens */
  maxTokensField: "max_tokens" | "max_completion_tokens";
  maxOutputTokens: number;
  extraHeaders?: Record<string, string>;
  /** extra body fields per request (e.g. OpenRouter provider routing) */
  extraBody?: (mode: JsonMode | "stream") => Record<string, unknown>;
  streamUsageOption?: boolean;
  /** model list includes capability metadata (OpenRouter) */
  richModelList?: boolean;
}

function userContent(parts: Part[]) {
  if (parts.every((p) => p.type === "text")) return parts.map((p) => (p as { text: string }).text).join("\n\n");
  return parts.map((p) => (p.type === "text" ? { type: "text", text: p.text } : { type: "image_url", image_url: { url: `data:${p.mediaType};base64,${p.data}` } }));
}

const usageOf = (r: OAResp): Usage | undefined => {
  const u = r.usage ?? r.x_groq?.usage;
  return u ? { inputTokens: u.prompt_tokens, outputTokens: u.completion_tokens } : undefined;
};

/** Some gateways return HTTP 200 with an error object. */
function bodyError(r: OAResp) {
  if (!r.error) return;
  const code = typeof r.error.code === "number" ? r.error.code : Number(r.error.code) || 502;
  throw classifyHttp(code, `${r.error.message ?? ""} ${JSON.stringify(r.error.metadata ?? "")}`);
}

export function openAICompatAdapter(o: OpenAICompatOptions): ProviderAdapter {
  const headers = (key: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...o.extraHeaders });
  return {
    id: o.id,
    label: o.label,
    jsonModes: ["native", "object", "prompt"],

    async listModels(key, signal) {
      const res = await call(`${o.baseUrl}/models`, { headers: headers(key) }, signal);
      const d = (await readJson(res)) as { data?: { id: string; architecture?: { input_modalities?: string[] }; supported_parameters?: string[] }[] };
      return (d.data ?? []).map((m) => ({
        id: m.id,
        vision: o.richModelList ? Boolean(m.architecture?.input_modalities?.includes("image")) : undefined,
        json: o.richModelList && m.supported_parameters ? m.supported_parameters.includes("response_format") || m.supported_parameters.includes("structured_outputs") : undefined,
      }));
    },

    async generateObject(req: ObjectRequest, ctx: CallContext, mode: JsonMode) {
      const sys = req.system + (mode === "native" ? "" : schemaInstruction(req.schema)) + (req.repairNote ?? "");
      const body: Record<string, unknown> = {
        model: ctx.model.id,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userContent(req.parts) },
        ],
        [o.maxTokensField]: o.maxOutputTokens,
        ...(mode === "native" && { response_format: { type: "json_schema", json_schema: { name: "response", strict: false, schema: jsonSchemaOf(req.schema) } } }),
        ...(mode === "object" && { response_format: { type: "json_object" } }),
        ...o.extraBody?.(mode),
      };
      const res = await call(`${o.baseUrl}/chat/completions`, { method: "POST", headers: headers(ctx.key), body: JSON.stringify(body) }, ctx.signal);
      const q = quotaFromHeaders(res.headers);
      if (q) ctx.onQuota?.(q);
      const r = (await readJson(res)) as OAResp;
      bodyError(r);
      const c = r.choices?.[0];
      if (!c) throw new ProviderError("invalid_output", "no choices returned");
      if (c.finish_reason === "content_filter" || c.message?.refusal) throw new ProviderError("refusal", "content filtered");
      if (c.finish_reason === "length") throw new ProviderError("invalid_output", "response truncated (max tokens)");
      return { text: c.message?.content ?? "", usage: usageOf(r) };
    },

    async stream(req: StreamRequest, ctx: CallContext): Promise<StreamHandle> {
      const body = {
        model: ctx.model.id,
        stream: true,
        messages: [{ role: "system", content: req.system }, ...req.messages],
        [o.maxTokensField]: Math.min(req.maxTokens ?? 8000, o.maxOutputTokens),
        ...(o.streamUsageOption && { stream_options: { include_usage: true } }),
        ...o.extraBody?.("stream"),
      };
      const res = await call(`${o.baseUrl}/chat/completions`, { method: "POST", headers: headers(ctx.key), body: JSON.stringify(body) }, ctx.signal);
      const q = quotaFromHeaders(res.headers);
      if (q) ctx.onQuota?.(q);
      let usage: Usage | undefined;
      let resolveDone!: (v: { usage?: Usage }) => void;
      let rejectDone!: (e: unknown) => void;
      const done = new Promise<{ usage?: Usage }>((a, b) => ((resolveDone = a), (rejectDone = b)));
      done.catch(() => {});
      async function* chunks() {
        try {
          for await (const data of sse(res)) {
            if (data === "[DONE]") break;
            const r = JSON.parse(data) as OAResp;
            bodyError(r);
            usage = usageOf(r) ?? usage;
            const c = r.choices?.[0];
            if (c?.finish_reason === "content_filter") throw new ProviderError("refusal", "content filtered");
            const t = c?.delta?.content;
            if (t) yield t;
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
