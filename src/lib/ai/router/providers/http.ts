import { classifyHttp, classifyThrown, ProviderError } from "../errors";
import type { QuotaHint } from "../types";

/** fetch that turns every non-2xx / network failure into a classified ProviderError. */
export async function call(url: string, init: RequestInit, signal: AbortSignal): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal });
  } catch (err) {
    throw classifyThrown(err);
  }
  if (!res.ok) {
    const body = (await res.text().catch(() => "")).slice(0, 4000);
    throw classifyHttp(res.status, body, res.headers);
  }
  return res;
}

export async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    throw new ProviderError("invalid_output", "provider returned non-JSON body");
  }
}

/** Server-sent events: yields each `data:` payload. */
export async function* sse(res: Response): AsyncGenerator<string> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i: number;
      while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i).replace(/^\r?\n\r?\n/, "");
        const data = block
          .split(/\r?\n/)
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trimStart())
          .join("\n");
        if (data) yield data;
      }
    }
    const tail = buf.trim();
    if (tail.startsWith("data:")) yield tail.slice(5).trimStart();
  } finally {
    reader.releaseLock();
  }
}

export function quotaFromHeaders(h: Headers): QuotaHint | undefined {
  const n = (k: string) => {
    const v = h.get(k);
    return v !== null && Number.isFinite(Number(v)) ? Number(v) : undefined;
  };
  const q: QuotaHint = {
    remainingRequests: n("x-ratelimit-remaining-requests"),
    remainingTokens: n("x-ratelimit-remaining-tokens"),
    limitRequests: n("x-ratelimit-limit-requests"),
    resetRequests: h.get("x-ratelimit-reset-requests") ?? undefined,
  };
  return Object.values(q).some((v) => v !== undefined) ? q : undefined;
}
