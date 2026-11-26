/** Error classification shared by all adapters. */
export type ErrorKind =
  | "auth" // 401/403, invalid or revoked key -> try another key, never retry same key
  | "rate_limit" // 429 short-term limit -> cooldown, fail over
  | "quota" // daily/monthly quota or credits exhausted -> long cooldown, fail over
  | "overloaded" // 503/529 -> retry with backoff, then fail over
  | "server" // other 5xx -> retry with backoff, then fail over
  | "network" // connection failed
  | "timeout"
  | "model_unavailable" // 404 / decommissioned / not enabled -> next model, then fail over
  | "unsupported" // request too large / feature not supported by this model -> fail over
  | "bad_request" // other 4xx -> fail over (may be provider-specific), never retried
  | "refusal" // safety block -> stop, never shopped around to other providers
  | "invalid_output" // non-JSON / schema mismatch / truncated -> one repair, then fail over
  | "capability" // no provider can serve this request type
  | "exhausted"; // every candidate failed

export class ProviderError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
    public opts: { status?: number; retryAfterMs?: number; provider?: string; detail?: string } = {},
  ) {
    super(message);
    this.name = "ProviderError";
  }
  get retryAfterMs() {
    return this.opts.retryAfterMs;
  }
}

/** Thrown by the router to API routes. Message is user-facing (Hebrew); never contains keys or prompt content. */
export class RouterError extends Error {
  constructor(public kind: ErrorKind, message: string, public status: number, public attempts: number) {
    super(message);
    this.name = "RouterError";
  }
}

export function parseRetryAfter(headers: Headers | Record<string, string | undefined> | undefined, body?: string): number | undefined {
  const get = (k: string) => (headers instanceof Headers ? headers.get(k) : headers?.[k] ?? headers?.[k.toLowerCase()]) ?? null;
  const ra = get("retry-after");
  if (ra) {
    const n = Number(ra);
    if (Number.isFinite(n)) return Math.max(0, n * 1000);
    const d = Date.parse(ra);
    if (Number.isFinite(d)) return Math.max(0, d - Date.now());
  }
  const ms = get("retry-after-ms");
  if (ms && Number.isFinite(Number(ms))) return Number(ms);
  // Gemini: {"@type": "...RetryInfo", "retryDelay": "31s"}
  const m = body?.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (m) return Number(m[1]) * 1000;
  // Groq/OpenAI style text: "Please try again in 7.5s" / "in 1m30s" / "in 450ms"
  const t = body?.match(/try again in\s+(?:(\d+)m)?(\d+(?:\.\d+)?)(ms|s)\b/i);
  if (t) return (Number(t[1] ?? 0) * 60 + Number(t[2]) / (t[3] === "ms" ? 1000 : 1)) * 1000;
  return undefined;
}

const QUOTA_RE = /quota|per.?day|daily|per.?month|insufficient.?(credits|balance|funds)|credit|billing|exceeded your current|RPD|TPD|requests per day|tokens per day/i;
const MODEL_RE = /model.{0,40}(not.?found|does not exist|decommissioned|deprecated|not supported|unavailable|is not available|no endpoints)|unknown model|invalid model|model_not_found|model_decommissioned|No endpoints found/i;
const AUTH_RE = /api.?key.{0,20}(not valid|invalid|expired|revoked)|API_KEY_INVALID|invalid_api_key|unauthori[sz]ed|authentication/i;
const TOO_LARGE_RE = /too large|tokens per minute \(TPM\): Limit|request entity|exceeds.{0,30}(limit|maximum)|context.?length|maximum context|too many images|image.{0,20}(size|too)/i;

/** Map an HTTP failure to an ErrorKind. Body is used only for classification, never logged in full. */
export function classifyHttp(status: number, body: string, headers?: Headers): ProviderError {
  const retryAfterMs = parseRetryAfter(headers, body);
  const short = body.replace(/\s+/g, " ").slice(0, 300);
  if (status === 401 || status === 403 || (status === 400 && AUTH_RE.test(body))) {
    // 403 can also be "region not supported" / "permission denied for model" — still not fixable by retrying this key.
    if (status === 403 && MODEL_RE.test(body)) return new ProviderError("model_unavailable", "model not permitted", { status, detail: short });
    return new ProviderError("auth", "authentication failed", { status, detail: short });
  }
  if (status === 402) return new ProviderError("quota", "payment required / credits exhausted", { status, retryAfterMs, detail: short });
  if (status === 429) {
    const quota = QUOTA_RE.test(body) && !/per.?minute|RPM|TPM/i.test(body);
    return new ProviderError(quota ? "quota" : "rate_limit", quota ? "quota exhausted" : "rate limited", { status, retryAfterMs, detail: short });
  }
  if (status === 404 || ((status === 400 || status === 422) && MODEL_RE.test(body))) return new ProviderError("model_unavailable", "model unavailable", { status, detail: short });
  if (status === 413 || ((status === 400 || status === 422) && TOO_LARGE_RE.test(body))) return new ProviderError("unsupported", "request too large for this model", { status, detail: short });
  if (status === 503 || status === 529) return new ProviderError("overloaded", "provider overloaded", { status, retryAfterMs, detail: short });
  if (status === 408 || status === 504) return new ProviderError("timeout", "provider timeout", { status, detail: short });
  if (status >= 500) return new ProviderError("server", `provider error ${status}`, { status, retryAfterMs, detail: short });
  return new ProviderError("bad_request", `bad request ${status}`, { status, detail: short });
}

export function classifyThrown(err: unknown): ProviderError {
  if (err instanceof ProviderError) return err;
  const e = err as { name?: string; message?: string; cause?: { code?: string } };
  if (e?.name === "TimeoutError") return new ProviderError("timeout", "attempt timed out");
  if (e?.name === "AbortError") return new ProviderError("timeout", "aborted");
  return new ProviderError("network", `network error${e?.cause?.code ? ` (${e.cause.code})` : ""}`);
}

export const RETRYABLE_SAME: ReadonlySet<string> = new Set(["overloaded", "server", "network", "timeout"]);
