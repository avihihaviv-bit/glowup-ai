/**
 * Multi-provider AI router.
 *
 * Per request it builds a fixed, ordered plan of candidates (provider -> model -> key) that have every
 * capability the request needs, then walks it once:
 *  - transient errors (5xx/network/timeout, short 429s) are retried on the same candidate with
 *    exponential backoff + jitter, a bounded number of times;
 *  - rate limits / exhausted quotas put the key (or the whole provider, when keys share a quota)
 *    into cooldown and move to the next provider;
 *  - auth errors disable that key and try the provider's next key;
 *  - unavailable models are skipped for an hour and the provider's next model is tried;
 *  - safety refusals stop the request: they are never shopped around to other providers.
 * Loop protection: every provider is visited at most once per request (no ping-pong), total attempts
 * are capped (AI_MAX_ATTEMPTS) and the whole request has a deadline (AI_DEADLINE_MS). A circuit breaker
 * takes a repeatedly failing provider out of rotation for a while.
 * Requests are sent to one provider at a time — never to several in parallel.
 */
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import { ProviderError, RETRYABLE_SAME, RouterError, classifyThrown, type ErrorKind } from "./errors";
import { parseJson } from "./json";
import { keyState, log, providerState, store, type ProviderState } from "./state";
import type { ChatTurn, Effort, JsonMode, ModelSpec, Needs, Part, ProviderAdapter, ProviderConfig, ProviderId, RouterConfig, StreamHandle, Tier, Usage } from "./types";
import { activeProviders } from "./config";

const HOUR = 3_600_000;
const DISCOVERY_TTL = HOUR;
const DISCOVERY_FAIL_TTL = 5 * 60_000;
const JSON_MODE_RE = /schema|response_format|json_schema|responseJsonSchema|responseMimeType|structured|json mode|json_object/i;
const KEY_LIKE = /\b(sk-[A-Za-z0-9_-]{8,}|gsk_[A-Za-z0-9]{8,}|AIza[0-9A-Za-z_-]{10,}|sk-or-[A-Za-z0-9_-]{8,})/g;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) return resolve();
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

export interface Candidate {
  cfg: ProviderConfig;
  adapter: ProviderAdapter;
  models: ModelSpec[];
}

interface Attempt<R> {
  (c: { adapter: ProviderAdapter; cfg: ProviderConfig; model: ModelSpec; key: string; keyId: string; signal: AbortSignal; jsonMode: JsonMode; repairNote?: string; onQuota: (q: object) => void }): Promise<{ result: R; usage?: Usage }>;
}

export class AIRouter {
  constructor(
    public cfg: RouterConfig,
    private adapters: Record<string, ProviderAdapter>,
    private now: () => number = Date.now,
    private random: () => number = Math.random,
  ) {}

  /** Providers with at least one key, in priority order. */
  configured() {
    return activeProviders(this.cfg).filter((p) => this.adapters[p.id]);
  }

  enabled() {
    return this.configured().length > 0;
  }

  /** Complexity-based tier: long inputs or many images move a "fast" request up to "balanced". */
  tierFor(base: Tier, parts: Part[]): Tier {
    const chars = parts.reduce((a, p) => a + (p.type === "text" ? p.text.length : 0), 0);
    const images = parts.filter((p) => p.type === "image").length;
    if (base === "fast" && (chars > 12_000 || images >= 3)) return "balanced";
    return base;
  }

  // ---------- public API ----------

  async generateObject<T extends z.ZodType>(opts: { task: string; system: string; parts: Part[]; schema: T; tier: Tier; effort?: Effort; only?: ProviderId }): Promise<z.infer<T>> {
    const images = opts.parts.filter((p) => p.type === "image").length;
    const needs: Needs = { vision: images > 0, json: true, stream: false };
    const tier = this.tierFor(opts.tier, opts.parts);
    return this.run<z.infer<T>>(opts.task, needs, tier, images, async (c) => {
      const out = await c.adapter.generateObject({ task: opts.task, system: opts.system, parts: opts.parts, schema: opts.schema, tier, effort: opts.effort, repairNote: c.repairNote }, { key: c.key, model: c.model, signal: c.signal, onQuota: c.onQuota }, c.jsonMode);
      const result = out.parsed !== undefined ? (opts.schema.parse(out.parsed) as z.infer<T>) : parseJson(opts.schema, out.text);
      return { result, usage: out.usage };
    }, undefined, false, opts.only);
  }

  /**
   * Streaming text. Failover is possible only until the first token arrives; after that a failure
   * is reported to the caller (switching providers mid-answer would mix two different responses).
   */
  async streamText(opts: { task: string; system: string; messages: ChatTurn[]; tier: Tier; effort?: Effort; maxTokens?: number }): Promise<{ chunks: AsyncIterable<string>; done: Promise<{ refusal?: boolean }>; provider: ProviderId; model: string; abort: () => void }> {
    const needs: Needs = { vision: false, json: false, stream: true };
    let served!: { cfg: ProviderConfig; model: ModelSpec; keyId: string; startedAt: number };
    let requestId = "";
    const opened = await this.run<{ handle: StreamHandle; first: IteratorResult<string>; it: AsyncIterator<string> }>(opts.task, needs, opts.tier, 0, async (c) => {
      const handle = await c.adapter.stream({ task: opts.task, system: opts.system, messages: opts.messages, tier: opts.tier, effort: opts.effort, maxTokens: opts.maxTokens }, { key: c.key, model: c.model, signal: c.signal, onQuota: c.onQuota });
      const it = handle.chunks[Symbol.asyncIterator]();
      const first = await it.next(); // errors before the first token are still failover-able
      served = { cfg: c.cfg, model: c.model, keyId: c.keyId, startedAt: this.now() };
      return { result: { handle, first, it } };
    }, (id) => (requestId = id), true);

    const { handle, first, it } = opened;
    const ps = providerState(served.cfg.id);
    const now = this.now;
    const scrub = (m: string) => this.scrub(m);
    async function* chunks() {
      try {
        if (!first.done && first.value) yield first.value;
        for (;;) {
          const n = await it.next();
          if (n.done) break;
          yield n.value;
        }
      } catch (err) {
        const e = classifyThrown(err);
        ps.failures[e.kind] = (ps.failures[e.kind] ?? 0) + 1;
        ps.lastError = { kind: e.kind, status: e.opts.status, at: now(), message: scrub(e.message) };
        log({ requestId, task: opts.task, provider: served.cfg.id, model: served.model.id, keyId: served.keyId, attempt: 0, outcome: "stream_error", kind: e.kind, status: e.opts.status, latencyMs: now() - served.startedAt, note: "failed after first token; no failover" });
        throw e;
      }
    }
    const done = handle.done.then((d) => {
      ps.inputTokens += d.usage?.inputTokens ?? 0;
      ps.outputTokens += d.usage?.outputTokens ?? 0;
      return { refusal: (d as { refusal?: boolean }).refusal };
    });
    done.catch(() => {});
    return { chunks: chunks(), done, provider: served.cfg.id, model: served.model.id, abort: handle.abort };
  }

  // ---------- planning ----------

  private async discover(cfg: ProviderConfig, adapter: ProviderAdapter, ps: ProviderState) {
    const t = this.now();
    if (ps.discovered && t - ps.discovered.at < (ps.discovered.models ? DISCOVERY_TTL : DISCOVERY_FAIL_TTL)) return;
    if (!adapter.listModels) {
      ps.discovered = { at: t, models: null };
      return;
    }
    const key = cfg.keys.find((k, i) => keyState(cfg.id, k, i).disabledUntil <= t);
    if (!key) return;
    try {
      const list = await adapter.listModels(key, AbortSignal.timeout(8_000));
      ps.discovered = { at: t, models: list ? new Map(list.map((m) => [m.id, { vision: m.vision, json: m.json }])) : null };
    } catch {
      ps.discovered = { at: t, models: null };
    }
  }

  /** Ordered models of this provider that satisfy the request's needs. */
  modelsFor(cfg: ProviderConfig, ps: ProviderState, needs: Needs, tier: Tier, images: number): ModelSpec[] {
    const t = this.now();
    const wanted = needs.vision ? [...cfg.visionModels, ...cfg.models[tier]] : cfg.models[tier];
    const disc = ps.discovered?.models;
    const out: ModelSpec[] = [];
    for (const id of [...new Set(wanted)]) {
      if ((ps.modelUnavailable.get(id) ?? 0) > t) continue;
      const info = disc?.get(id);
      if (disc && !info && disc.size > 0) continue; // the account's model list doesn't have it
      const vision = info?.vision ?? cfg.visionCapable(id);
      if (needs.vision && !vision) continue;
      if (needs.json && info?.json === false) continue;
      if (images > (cfg.maxImages ?? Infinity)) continue;
      out.push({ id, vision, json: info?.json ?? true, stream: true, maxImages: cfg.maxImages });
    }
    return out;
  }

  /** Why a provider can't take a request right now (null = usable). */
  unavailableReason(cfg: ProviderConfig, ps: ProviderState): string | null {
    const t = this.now();
    if (!cfg.keys.length) return "no keys";
    if (ps.circuitOpenUntil > t) return `circuit open for ${Math.ceil((ps.circuitOpenUntil - t) / 1000)}s`;
    if (ps.cooldownUntil > t) return `cooldown ${Math.ceil((ps.cooldownUntil - t) / 1000)}s (${ps.cooldownReason ?? "rate limit"})`;
    if (cfg.dailyRequestLimit && ps.dayRequests >= cfg.dailyRequestLimit) return `local daily limit ${cfg.dailyRequestLimit} reached`;
    const usable = cfg.keys.some((k, i) => {
      const ks = keyState(cfg.id, k, i);
      return ks.disabledUntil <= t && ks.cooldownUntil <= t;
    });
    if (!usable) return "all keys disabled or cooling down";
    return null;
  }

  // ---------- execution ----------

  private backoff(n: number, retryAfter?: number) {
    const exp = Math.min(this.cfg.backoffCapMs, this.cfg.backoffBaseMs * 2 ** n);
    const jittered = exp / 2 + this.random() * (exp / 2); // "equal jitter"
    return Math.max(jittered, retryAfter ?? 0);
  }

  scrub(s: string) {
    let out = s.replace(KEY_LIKE, "[redacted]");
    for (const p of this.cfg.providers) for (const k of p.keys) if (k.length >= 8) out = out.split(k).join("[redacted]");
    return out;
  }

  private async run<R>(task: string, needs: Needs, tier: Tier, images: number, attempt: Attempt<R>, onRequestId?: (id: string) => void, isStream = false, only?: ProviderId): Promise<R> {
    const requestId = randomUUID().slice(0, 8);
    onRequestId?.(requestId);
    const st = store();
    st.totalRequests++;
    const deadline = this.now() + this.cfg.deadlineMs;
    let attempts = 0;
    const providers = this.configured().filter((p) => !only || p.id === only);
    if (!providers.length) throw new RouterError("capability", "לא הוגדר אף ספק AI בשרת.", 503, 0);

    const capable: { cfg: ProviderConfig; adapter: ProviderAdapter; ps: ProviderState }[] = [];
    const skipped: string[] = [];
    for (const cfg of providers) {
      const adapter = this.adapters[cfg.id];
      const ps = providerState(cfg.id);
      const reason = this.unavailableReason(cfg, ps);
      if (reason) {
        skipped.push(`${cfg.id}: ${reason}`);
        log({ requestId, task, provider: cfg.id, attempt: 0, outcome: "skip", note: reason });
        continue;
      }
      capable.push({ cfg, adapter, ps });
    }

    let lastErr: ProviderError | undefined;
    let anyCapable = false;

    for (const { cfg, adapter, ps } of capable) {
      await this.discover(cfg, adapter, ps);
      const models = this.modelsFor(cfg, ps, needs, tier, images);
      if (!models.length) {
        log({ requestId, task, provider: cfg.id, attempt: 0, outcome: "skip", note: needs.vision ? "no vision-capable model" : "no model for tier" });
        continue;
      }
      anyCapable = true;
      let providerFailed: ProviderError | undefined;

      modelLoop: for (const model of models) {
        for (let ki = 0; ki < cfg.keys.length; ki++) {
          const key = cfg.keys[ki];
          const ks = keyState(cfg.id, key, ki);
          const t0 = this.now();
          if (ks.disabledUntil > t0 || ks.cooldownUntil > t0) continue;

          let retries = 0;
          let repairNote: string | undefined;
          let repaired = false;
          const modes = adapter.jsonModes;
          let modeIdx = Math.max(0, modes.indexOf(ps.jsonMode.get(model.id) ?? modes[0]));

          for (;;) {
            if (attempts >= this.cfg.maxAttempts || this.now() >= deadline) {
              throw this.exhausted(lastErr, attempts, skipped, "attempt limit reached");
            }
            attempts++;
            ps.requests++;
            ps.dayRequests++;
            ks.requests++;
            ks.lastUsedAt = this.now();
            const start = this.now();
            const signal = AbortSignal.timeout(Math.max(1_000, Math.min(this.cfg.attemptTimeoutMs, deadline - start)));
            try {
              const { result, usage } = await attempt({ adapter, cfg, model, key, keyId: ks.id, signal, jsonMode: modes[modeIdx], repairNote, onQuota: (q) => (ps.quota = { ...q, at: this.now() }) });
              const ms = this.now() - start;
              ps.success++;
              ps.latencyTotal += ms;
              ps.latencyCount++;
              ps.inputTokens += usage?.inputTokens ?? 0;
              ps.outputTokens += usage?.outputTokens ?? 0;
              ps.consecutiveFailures = 0;
              ps.circuitTrips = 0;
              ps.lastSuccessAt = this.now();
              ps.jsonMode.set(model.id, modes[modeIdx]);
              ks.success++;
              st.lastServed = { provider: cfg.id, model: model.id, at: this.now(), task };
              log({ requestId, task, provider: cfg.id, model: model.id, keyId: ks.id, attempt: attempts, outcome: "success", latencyMs: ms, note: isStream ? "stream opened" : modes[modeIdx] !== "native" ? `json:${modes[modeIdx]}` : undefined });
              return result;
            } catch (raw) {
              const e = classifyThrown(raw);
              const ms = this.now() - start;
              lastErr = e;
              ps.failures[e.kind] = (ps.failures[e.kind] ?? 0) + 1;
              ps.lastError = { kind: e.kind, status: e.opts.status, at: this.now(), message: this.scrub(`${e.message}${e.opts.detail ? `: ${e.opts.detail}` : ""}`).slice(0, 240) };
              ks.failures++;
              const base = { requestId, task, provider: cfg.id, model: model.id, keyId: ks.id, attempt: attempts, kind: e.kind, status: e.opts.status, latencyMs: ms };

              // 1. safety refusal: stop. Never retried elsewhere.
              if (e.kind === "refusal") {
                log({ ...base, outcome: "error", note: "refusal: not retried on other providers" });
                throw new RouterError("refusal", "הבקשה נדחתה על ידי מודל ה-AI. נסו ניסוח או תמונה אחרים.", 422, attempts);
              }
              // 2. JSON strategy not accepted by this model -> next strategy, same model/key
              if ((e.kind === "bad_request" || e.kind === "unsupported") && modeIdx < modes.length - 1 && JSON_MODE_RE.test(e.opts.detail ?? e.message)) {
                modeIdx++;
                log({ ...base, outcome: "retry", note: `json mode -> ${modes[modeIdx]}` });
                continue;
              }
              // 3. bad JSON / schema mismatch -> one repair attempt on the same candidate
              if (e.kind === "invalid_output" && !repaired && !isStream) {
                repaired = true;
                repairNote = `\n\nIMPORTANT: your previous reply was rejected (${(e.opts.detail ?? e.message).slice(0, 200)}). Reply again with valid JSON only, exactly matching the schema.`;
                log({ ...base, outcome: "retry", note: "repair invalid output" });
                continue;
              }
              // 4. transient: backoff + jitter on the same candidate
              const shortWait = e.kind === "rate_limit" && (e.retryAfterMs ?? Infinity) <= this.cfg.maxInlineWaitMs;
              if ((RETRYABLE_SAME.has(e.kind) || shortWait) && retries < this.cfg.maxTransientRetries && (e.retryAfterMs ?? 0) <= this.cfg.backoffCapMs) {
                const wait = this.backoff(retries, e.retryAfterMs);
                if (this.now() + wait < deadline) {
                  retries++;
                  log({ ...base, outcome: "retry", note: `backoff ${Math.round(wait)}ms` });
                  await sleep(wait);
                  continue;
                }
              }
              log({ ...base, outcome: "error", note: e.opts.detail ? this.scrub(e.opts.detail).slice(0, 160) : undefined });

              // 5. decide what to try next
              if (e.kind === "auth") {
                ks.disabledUntil = this.now() + HOUR;
                ks.disabledReason = "authentication failed";
                break; // next key, same model
              }
              if (e.kind === "rate_limit" || e.kind === "quota") {
                const cool = e.retryAfterMs ?? (e.kind === "quota" ? HOUR : 30_000);
                // Free-tier limits are usually per model (Gemini, Groq): park this model and try the
                // provider's next model before giving up on the whole provider.
                ps.modelUnavailable.set(model.id, this.now() + cool);
                if (models.indexOf(model) < models.length - 1) continue modelLoop;
                ks.cooldownUntil = this.now() + cool;
                if (cfg.separateQuota) break; // keys have independent quotas -> next key
                ps.cooldownUntil = this.now() + cool;
                ps.cooldownReason = e.kind === "quota" ? "quota exhausted" : "rate limited";
                providerFailed = e;
                break modelLoop;
              }
              if (e.kind === "model_unavailable" || e.kind === "unsupported") {
                if (e.kind === "model_unavailable") ps.modelUnavailable.set(model.id, this.now() + HOUR);
                continue modelLoop;
              }
              // server / overloaded / network / timeout (after retries), bad_request, invalid_output after repair
              providerFailed = e;
              break modelLoop;
            }
          }
        }
      }
      // provider exhausted -> circuit breaker bookkeeping, then the next provider
      const counts = !providerFailed || !["auth", "bad_request", "invalid_output", "unsupported"].includes(providerFailed.kind);
      if (counts) {
        ps.consecutiveFailures++;
        if (ps.consecutiveFailures >= this.cfg.circuitThreshold) {
          ps.circuitOpenUntil = this.now() + Math.min(10 * 60_000, this.cfg.circuitOpenMs * 2 ** ps.circuitTrips);
          ps.circuitTrips++;
          ps.consecutiveFailures = 0;
          log({ requestId, task, provider: cfg.id, attempt: attempts, outcome: "error", kind: providerFailed?.kind, note: "circuit opened" });
        }
      }
    }

    if (!anyCapable && !lastErr) {
      if (needs.vision && capable.length) throw new RouterError("capability", "אין כרגע ספק AI זמין שיודע לנתח תמונות. הגדירו מפתח לספק עם מודל ראייה (Gemini, OpenRouter או Anthropic).", 503, attempts);
      throw this.exhausted(undefined, attempts, skipped, "no provider available");
    }
    throw this.exhausted(lastErr, attempts, skipped, "all candidates failed");
  }

  private exhausted(last: ProviderError | undefined, attempts: number, skipped: string[], why: string) {
    const map: Partial<Record<ErrorKind, [string, number]>> = {
      auth: ["מפתחות ה-API של ספקי ה-AI אינם תקינים. בדקו את ההגדרות בשרת.", 401],
      rate_limit: ["כל ספקי ה-AI עמוסים כרגע (מגבלת קצב). נסו שוב בעוד דקה.", 429],
      quota: ["נגמרה המכסה אצל ספקי ה-AI שהוגדרו. נסו מאוחר יותר או הוסיפו ספק.", 429],
      unsupported: ["הבקשה גדולה מדי לספקי ה-AI הזמינים (למשל תמונה גדולה מדי).", 413],
      bad_request: ["ספקי ה-AI דחו את הבקשה. נסו שוב או בתמונה אחרת.", 400],
      invalid_output: ["לא התקבלה תשובה תקינה מה-AI. נסו שוב.", 502],
    };
    const [msg, status] = (last && map[last.kind]) ?? ["שירות ה-AI אינו זמין כרגע. נסו שוב בעוד רגע.", 503];
    const err = new RouterError(last?.kind ?? "exhausted", msg, status, attempts);
    console.warn(JSON.stringify({ evt: "ai_router_exhausted", why, attempts, last: last?.kind, skipped }));
    return err;
  }

  // ---------- admin ----------

  /** Clear cooldowns / circuit breakers / disabled keys (admin action). */
  reset(provider?: ProviderId) {
    for (const cfg of this.cfg.providers) {
      if (provider && cfg.id !== provider) continue;
      const ps = providerState(cfg.id);
      ps.cooldownUntil = 0;
      ps.circuitOpenUntil = 0;
      ps.consecutiveFailures = 0;
      ps.circuitTrips = 0;
      ps.modelUnavailable.clear();
      ps.discovered = undefined;
      for (const k of ps.keys.values()) {
        k.cooldownUntil = 0;
        k.disabledUntil = 0;
        k.disabledReason = undefined;
      }
    }
  }

  /** Sanitized status for the admin screen. Contains no keys and no user content. */
  snapshot() {
    const t = this.now();
    const st = store();
    const order = this.cfg.order;
    let active: ProviderId | null = null;
    const providers = order.map((id) => this.cfg.providers.find((p) => p.id === id)!).filter(Boolean).map((cfg) => {
      const ps = providerState(cfg.id);
      const reason = cfg.keys.length ? this.unavailableReason(cfg, ps) : "not configured";
      const status = !cfg.keys.length ? "not_configured" : !reason ? "available" : reason.startsWith("circuit") ? "circuit_open" : reason.startsWith("cooldown") ? "cooldown" : reason.startsWith("local daily") ? "daily_limit" : "keys_unavailable";
      if (status === "available" && !active) active = cfg.id;
      const visionNeeds: Needs = { vision: true, json: true, stream: false };
      const textNeeds: Needs = { vision: false, json: true, stream: false };
      return {
        id: cfg.id,
        label: cfg.label,
        status,
        reason,
        keys: cfg.keys.map((k, i) => {
          const ks = keyState(cfg.id, k, i);
          return { id: ks.id, requests: ks.requests, success: ks.success, failures: ks.failures, disabled: ks.disabledUntil > t ? ks.disabledReason ?? "disabled" : null, cooldownSec: ks.cooldownUntil > t ? Math.ceil((ks.cooldownUntil - t) / 1000) : 0 };
        }),
        separateQuota: cfg.separateQuota,
        models: cfg.keys.length
          ? {
              fast: this.modelsFor(cfg, ps, textNeeds, "fast", 0).map((m) => m.id),
              balanced: this.modelsFor(cfg, ps, textNeeds, "balanced", 0).map((m) => m.id),
              deep: this.modelsFor(cfg, ps, textNeeds, "deep", 0).map((m) => m.id),
              vision: this.modelsFor(cfg, ps, visionNeeds, "balanced", 1).map((m) => m.id),
            }
          : null,
        discovery: ps.discovered ? (ps.discovered.models ? `${ps.discovered.models.size} models listed` : "listing unavailable") : "not checked yet",
        requests: ps.requests,
        success: ps.success,
        failures: ps.failures,
        avgLatencyMs: ps.latencyCount ? Math.round(ps.latencyTotal / ps.latencyCount) : null,
        inputTokens: ps.inputTokens,
        outputTokens: ps.outputTokens,
        todayRequests: ps.dayRequests,
        dailyLimit: cfg.dailyRequestLimit ?? null,
        quota: ps.quota ?? null,
        lastError: ps.lastError ?? null,
        lastSuccessAt: ps.lastSuccessAt ?? null,
        unavailableModels: [...ps.modelUnavailable.entries()].filter(([, u]) => u > t).map(([m]) => m),
      };
    });
    return {
      primary: providers.find((p) => p.status !== "not_configured")?.id ?? null,
      active,
      order,
      lastServed: st.lastServed ?? null,
      totalRequests: st.totalRequests,
      since: st.startedAt,
      limits: { maxAttempts: this.cfg.maxAttempts, deadlineMs: this.cfg.deadlineMs, maxRetries: this.cfg.maxTransientRetries, circuitThreshold: this.cfg.circuitThreshold },
      providers,
      logs: st.logs.slice(-120).reverse(),
    };
  }
}
