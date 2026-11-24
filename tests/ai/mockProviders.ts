/**
 * HTTP mock of the Gemini, Groq, OpenRouter and Anthropic APIs (same paths, payload shapes, SSE framing
 * and error formats as the real services). Each provider has a script queue: the next request pops one
 * scripted response; when the queue is empty it answers successfully.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type Scripted =
  | { status: number; body?: unknown; headers?: Record<string, string> }
  | { ok: true; text?: string }
  | { sse: string[]; failAfter?: boolean }
  | { gemBlock: true }
  | { hang: number };

export interface Seen {
  provider: string;
  path: string;
  model?: string;
  key?: string;
  body: Record<string, unknown>;
}

export interface Mock {
  url: string;
  seen: Seen[];
  script: (provider: string, items: Scripted[]) => void;
  models: Record<string, { id: string; vision?: boolean }[] | null>;
  answer: (provider: string) => unknown;
  setAnswer: (fn: (provider: string) => unknown) => void;
  close: () => Promise<void>;
  clear: () => void;
}

const json = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};

async function readBody(req: IncomingMessage) {
  let s = "";
  for await (const c of req) s += c;
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export async function startMock(): Promise<Mock> {
  const queues: Record<string, Scripted[]> = {};
  const seen: Seen[] = [];
  let answerFn = (p: string): unknown => ({ answer: `hi from ${p}` });
  const mock = {} as Mock;
  mock.models = { gemini: null, groq: null, openrouter: null };

  const server: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const [, provider, ...rest] = url.pathname.split("/");
    const path = "/" + rest.join("/");
    const body = req.method === "POST" ? await readBody(req) : {};
    const key = (req.headers["x-goog-api-key"] as string) ?? (req.headers["x-api-key"] as string) ?? (req.headers.authorization ?? "").replace(/^Bearer /, "");

    // model listing
    if (req.method === "GET" && /\/models$/.test(path)) {
      const list = mock.models[provider];
      if (!list) return json(res, 404, { error: { message: "not found" } });
      if (provider === "gemini") return json(res, 200, { models: list.map((m) => ({ name: `models/${m.id}`, supportedGenerationMethods: ["generateContent"] })) });
      return json(res, 200, { data: list.map((m) => ({ id: m.id, architecture: { input_modalities: m.vision ? ["text", "image"] : ["text"] }, supported_parameters: ["response_format", "structured_outputs"] })) });
    }

    const model = provider === "gemini" ? decodeURIComponent(path.match(/models\/([^:]+):/)?.[1] ?? "") : (body.model as string);
    seen.push({ provider, path, model, key, body });
    const item = queues[provider]?.shift();
    const streaming = path.includes("streamGenerateContent") || body.stream === true;
    const text = JSON.stringify(answerFn(provider));

    if (item && "hang" in item) {
      await new Promise((r) => setTimeout(r, item.hang));
    }
    if (item && "status" in item) {
      const b = item.body ?? { error: { message: `mock error ${item.status}` } };
      if (typeof b === "string") {
        res.writeHead(item.status, item.headers ?? {});
        return res.end(b);
      }
      return json(res, item.status, b, item.headers);
    }
    if (item && "gemBlock" in item) return json(res, 200, { promptFeedback: { blockReason: "SAFETY" } });

    const out = item && "ok" in item && item.text !== undefined ? item.text : text;

    if (streaming) {
      const chunks = item && "sse" in item ? item.sse : [`[${provider}] `, "streamed ", "answer"];
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        if (provider === "gemini") res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: c }] } }] })}\n\n`);
        else if (provider === "anthropic") {
          if (i === 0) {
            res.write(`event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { id: "m1", type: "message", role: "assistant", model, content: [], stop_reason: null, usage: { input_tokens: 5, output_tokens: 0 } } })}\n\n`);
            res.write(`event: content_block_start\ndata: ${JSON.stringify({ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })}\n\n`);
          }
          res.write(`event: content_block_delta\ndata: ${JSON.stringify({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: c } })}\n\n`);
        } else res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`);
        await new Promise((r) => setTimeout(r, 5));
      }
      if (item && "sse" in item && item.failAfter) {
        res.destroy(); // connection drops mid-answer
        return;
      }
      if (provider === "gemini") res.write(`data: ${JSON.stringify({ candidates: [{ content: { parts: [] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 3 } })}\n\n`);
      else if (provider === "anthropic") {
        res.write(`event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`);
        res.write(`event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } })}\n\n`);
        res.write(`event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`);
      } else res.write(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 7, completion_tokens: 3 } })}\n\ndata: [DONE]\n\n`);
      return res.end();
    }

    if (provider === "gemini") return json(res, 200, { candidates: [{ content: { parts: [{ text: out }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } });
    if (provider === "anthropic")
      return json(res, 200, { id: "msg_1", type: "message", role: "assistant", model, content: [{ type: "text", text: out }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } });
    return json(res, 200, { id: "c1", choices: [{ message: { role: "assistant", content: out }, finish_reason: "stop" }], usage: { prompt_tokens: 10, completion_tokens: 5 } }, { "x-ratelimit-remaining-requests": "99", "x-ratelimit-limit-requests": "100" });
  });

  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  Object.assign(mock, {
    url: `http://127.0.0.1:${port}`,
    seen,
    script: (p: string, items: Scripted[]) => (queues[p] = [...(queues[p] ?? []), ...items]),
    answer: (p: string) => answerFn(p),
    setAnswer: (fn: (p: string) => unknown) => (answerFn = fn),
    close: () => new Promise<void>((r) => server.close(() => r())),
    clear: () => {
      seen.length = 0;
      for (const k of Object.keys(queues)) delete queues[k];
      answerFn = (p: string) => ({ answer: `hi from ${p}` });
      mock.models = { gemini: null, groq: null, openrouter: null };
    },
  });
  return mock;
}
