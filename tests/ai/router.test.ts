/**
 * Failover tests for the multi-provider AI router.
 * Real router + real provider adapters, talking HTTP to a local mock of each provider's API.
 * Run: npm run test:ai
 */
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { loadConfig } from "../../src/lib/ai/router/config";
import { ADAPTERS } from "../../src/lib/ai/router/providers/registry";
import { AIRouter } from "../../src/lib/ai/router/router";
import { RouterError } from "../../src/lib/ai/router/errors";
import { resetStore, store } from "../../src/lib/ai/router/state";
import type { ProviderAdapter } from "../../src/lib/ai/router/types";
import { startMock, type Mock } from "./mockProviders";

process.env.AI_ROUTER_LOG = "off";
const Answer = z.object({ answer: z.string() });
const IMG = { type: "image" as const, mediaType: "image/png" as const, data: "iVBORw0KGgo=" };

let mock: Mock;

function makeRouter(env: Record<string, string | undefined>) {
  const cfg = loadConfig({
    GEMINI_BASE_URL: `${mock.url}/gemini`,
    GROQ_BASE_URL: `${mock.url}/groq`,
    OPENROUTER_BASE_URL: `${mock.url}/openrouter`,
    ANTHROPIC_BASE_URL: `${mock.url}/anthropic`,
    AI_BACKOFF_BASE_MS: "5",
    AI_BACKOFF_CAP_MS: "60",
    AI_MAX_INLINE_WAIT_MS: "50",
    AI_DEADLINE_MS: "20000",
    AI_ATTEMPT_TIMEOUT_MS: "5000",
    ...env,
  });
  const adapters: Record<string, ProviderAdapter> = {};
  for (const p of cfg.providers) adapters[p.id] = ADAPTERS[p.id](p);
  return new AIRouter(cfg, adapters);
}

type AskExtra = Omit<Partial<Parameters<AIRouter["generateObject"]>[0]>, "schema">;
const ask = (r: AIRouter, extra: AskExtra = {}): Promise<z.infer<typeof Answer>> =>
  r.generateObject({ task: "test", system: "sys", parts: [{ type: "text", text: "hello" }], tier: "balanced", ...extra, schema: Answer });

// One model per tier, so provider-level failover is what these tests observe.
const ONE = { GEMINI_MODELS_BALANCED: "gemini-flash-latest", GEMINI_MODELS_FAST: "gemini-flash-lite-latest", GROQ_MODELS_BALANCED: "openai/gpt-oss-120b", GROQ_MODELS_FAST: "openai/gpt-oss-20b", OPENROUTER_MODELS_BALANCED: "openai/gpt-oss-120b" };
const three = { AI_PROVIDERS: "gemini,groq,openrouter", GEMINI_API_KEY: "AIzaTESTKEY000001", GROQ_API_KEY: "gsk_TESTKEY000002", OPENROUTER_API_KEY: "sk-or-TESTKEY000003", ...ONE };

before(async () => {
  mock = await startMock();
});
after(async () => {
  await mock.close();
});
beforeEach(() => {
  resetStore();
  mock.clear();
});

describe("basic routing", () => {
  test("uses the primary provider when healthy", async () => {
    const r = makeRouter(three);
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini"]);
    // native structured output was requested
    const gc = mock.seen[0].body.generationConfig as Record<string, unknown>;
    assert.equal(gc.responseMimeType, "application/json");
    assert.ok(gc.responseJsonSchema);
  });

  test("keys are sent only in auth headers, never in the URL", async () => {
    const r = makeRouter(three);
    await ask(r);
    assert.equal(mock.seen[0].key, "AIzaTESTKEY000001");
    assert.ok(!mock.seen[0].path.includes("TESTKEY"));
  });

  test("never sends the same request to several providers in parallel", async () => {
    const r = makeRouter(three);
    await ask(r);
    assert.equal(mock.seen.length, 1);
  });
});

describe("failover", () => {
  test("429 on primary -> next provider, primary cools down and is skipped next time", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ status: 429, body: { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Rate limit per minute", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "30s" }] } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini", "groq"]);
    mock.seen.length = 0;
    const out2 = await ask(r);
    assert.equal(out2.answer, "hi from groq");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["groq"], "gemini should be skipped while cooling down (retryDelay 30s)");
    const snap = r.snapshot();
    assert.equal(snap.providers.find((p) => p.id === "gemini")!.status, "cooldown");
    assert.equal(snap.active, "groq");
  });

  test("free-tier quota on one model -> same provider's next model, other models stay usable", async () => {
    const r = makeRouter({ ...three, GEMINI_MODELS_DEEP: "gemini-pro-latest,gemini-flash-latest" });
    mock.script("gemini", [{ status: 429, body: { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-pro" } } }]);
    const out = await ask(r, { tier: "deep" });
    assert.equal(out.answer, "hi from gemini");
    assert.deepEqual(mock.seen.map((s) => s.model), ["gemini-pro-latest", "gemini-flash-latest"]);
    const g = r.snapshot().providers.find((p) => p.id === "gemini")!;
    assert.equal(g.status, "available", "provider must not be locked because one model has no quota");
    assert.deepEqual(g.unavailableModels, ["gemini-pro-latest"]);
    mock.seen.length = 0;
    await ask(r, { tier: "deep" });
    assert.deepEqual(mock.seen.map((s) => s.model), ["gemini-flash-latest"], "the exhausted model is skipped until its cooldown ends");
  });

  test("daily quota exhausted -> long cooldown and failover", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ status: 429, body: { error: { message: "Quota exceeded for metric: generate_content_requests per day" } } }]);
    await ask(r);
    const g = r.snapshot().providers.find((p) => p.id === "gemini")!;
    assert.equal(g.failures.quota, 1);
    assert.match(g.reason ?? "", /quota exhausted/);
  });

  test("503 is retried with backoff on the same provider, then succeeds there", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ status: 503, body: { error: { message: "The model is overloaded" } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini", "gemini"]);
    assert.ok(store().logs.some((l) => l.outcome === "retry" && /backoff/.test(l.note ?? "")));
  });

  test("persistent 503 -> bounded retries then next provider", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ status: 503 }, { status: 503 }, { status: 503 }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini", "gemini", "groq"], "1 retry (AI_MAX_RETRIES=1) then failover");
  });

  test("network failure -> failover", async () => {
    const r = makeRouter({ ...three, GEMINI_BASE_URL: "http://127.0.0.1:1/gemini" });
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
  });

  test("model 404 -> next model of the same provider", async () => {
    const r = makeRouter({ ...three, GEMINI_MODELS_BALANCED: "gemini-old,gemini-new" });
    mock.script("gemini", [{ status: 404, body: { error: { code: 404, message: "models/gemini-old is not found for API version v1beta" } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
    assert.deepEqual(mock.seen.map((s) => s.model), ["gemini-old", "gemini-new"]);
    // remembered as unavailable
    mock.seen.length = 0;
    await ask(r);
    assert.deepEqual(mock.seen.map((s) => s.model), ["gemini-new"]);
  });

  test("model discovery skips models the account doesn't have", async () => {
    mock.models.gemini = [{ id: "gemini-3.8-flash" }];
    const r = makeRouter({ ...three, GEMINI_MODELS_BALANCED: "gemini-retired,gemini-3.8-flash" });
    await ask(r);
    assert.deepEqual(mock.seen.map((s) => s.model), ["gemini-3.8-flash"]);
  });
});

describe("keys", () => {
  test("401 on first key -> second key of the same provider, first key disabled", async () => {
    const r = makeRouter({ ...three, GEMINI_API_KEYS: "AIzaBADKEY0000001,AIzaGOODKEY000002", GEMINI_API_KEY: "" });
    mock.script("gemini", [{ status: 400, body: { error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT", details: [{ reason: "API_KEY_INVALID" }] } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
    assert.deepEqual(mock.seen.map((s) => s.key), ["AIzaBADKEY0000001", "AIzaGOODKEY000002"]);
    const keys = r.snapshot().providers.find((p) => p.id === "gemini")!.keys;
    assert.equal(keys[0].disabled, "authentication failed");
    assert.equal(keys[1].disabled, null);
  });

  test("429 with shared-quota keys does NOT rotate to another key (no limit bypassing)", async () => {
    const r = makeRouter({ ...three, GROQ_API_KEYS: "gsk_KEYA00000001,gsk_KEYB00000002", GROQ_API_KEY: "", AI_PROVIDERS: "groq,openrouter" });
    mock.script("groq", [{ status: 429, body: { error: { message: "Rate limit reached for model in organization on requests per minute (RPM). Please try again in 20s." } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from openrouter");
    assert.deepEqual(mock.seen.map((s) => `${s.provider}:${s.key}`), ["groq:gsk_KEYA00000001", "openrouter:sk-or-TESTKEY000003"]);
  });

  test("429 with keys declared as separate quotas -> next key", async () => {
    const r = makeRouter({ ...three, GROQ_API_KEYS: "gsk_KEYA00000001,gsk_KEYB00000002", GROQ_API_KEY: "", GROQ_KEYS_SEPARATE_QUOTA: "true", AI_PROVIDERS: "groq,openrouter" });
    mock.script("groq", [{ status: 429, body: { error: { message: "Rate limit reached... Please try again in 20s." } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
    assert.deepEqual(mock.seen.map((s) => s.key), ["gsk_KEYA00000001", "gsk_KEYB00000002"]);
  });

  test("snapshot and logs never contain key material", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ status: 401, body: { error: { message: "Invalid key AIzaTESTKEY000001 provided" } } }]);
    await ask(r);
    const dump = JSON.stringify(r.snapshot());
    for (const k of ["AIzaTESTKEY000001", "gsk_TESTKEY000002", "sk-or-TESTKEY000003"]) assert.ok(!dump.includes(k), `snapshot leaks ${k}`);
    assert.match(dump, /\[redacted\]/);
  });
});

describe("capabilities", () => {
  test("image request skips text-only providers (Groq text models)", async () => {
    const r = makeRouter({ AI_PROVIDERS: "groq,openrouter", GROQ_API_KEY: "gsk_TESTKEY000002", GROQ_MODELS_VISION: "", OPENROUTER_API_KEY: "sk-or-TESTKEY000003" });
    // groq vision list is the preview default; make groq have NO vision model:
    r.cfg.providers.find((p) => p.id === "groq")!.visionModels = [];
    r.cfg.providers.find((p) => p.id === "groq")!.visionCapable = () => false;
    const out = await ask(r, { parts: [IMG, { type: "text", text: "what is this" }] });
    assert.equal(out.answer, "hi from openrouter");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["openrouter"], "groq must not be called for images");
    const content = (mock.seen[0].body.messages as { content: unknown }[])[1].content as { type: string }[];
    assert.equal(content[0].type, "image_url");
  });

  test("no vision-capable provider -> clear error, zero calls", async () => {
    const r = makeRouter({ AI_PROVIDERS: "groq", GROQ_API_KEY: "gsk_TESTKEY000002" });
    r.cfg.providers.find((p) => p.id === "groq")!.visionModels = [];
    r.cfg.providers.find((p) => p.id === "groq")!.visionCapable = () => false;
    await assert.rejects(ask(r, { parts: [IMG] }), (e: RouterError) => e.kind === "capability" && /תמונות/.test(e.message));
    assert.equal(mock.seen.length, 0);
  });

  test("OpenRouter discovery: a text-only model is not used for images", async () => {
    mock.models.openrouter = [{ id: "openai/gpt-oss-120b", vision: false }, { id: "google/gemini-3.8-flash", vision: true }];
    const r = makeRouter({ AI_PROVIDERS: "openrouter", OPENROUTER_API_KEY: "sk-or-TESTKEY000003", OPENROUTER_MODELS_VISION: "openai/gpt-oss-120b,google/gemini-3.8-flash" });
    await ask(r, { parts: [IMG] });
    assert.deepEqual(mock.seen.map((s) => s.model), ["google/gemini-3.8-flash"]);
    const prov = mock.seen[0].body.provider as Record<string, unknown>;
    assert.equal(prov.data_collection, "deny");
  });

  test("complexity: long input upgrades fast -> balanced model", async () => {
    const r = makeRouter({ ...three, GEMINI_MODELS_FAST: "g-fast", GEMINI_MODELS_BALANCED: "g-balanced" });
    await ask(r, { tier: "fast", parts: [{ type: "text", text: "short" }] });
    await ask(r, { tier: "fast", parts: [{ type: "text", text: "x".repeat(13000) }] });
    assert.deepEqual(mock.seen.map((s) => s.model), ["g-fast", "g-balanced"]);
  });
});

describe("structured output", () => {
  test("invalid JSON -> one repair attempt on the same provider", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ ok: true, text: "Sure! here you go: not json" }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
    assert.equal(mock.seen.length, 2);
    const sys = (mock.seen[1].body.systemInstruction as { parts: { text: string }[] }).parts[0].text;
    assert.match(sys, /previous reply was rejected/);
  });

  test("schema mismatch twice -> failover", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ ok: true, text: '{"wrong":1}' }, { ok: true, text: '{"wrong":2}' }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
  });

  test("provider rejects native json_schema -> falls back to json_object mode and remembers it", async () => {
    const r = makeRouter({ AI_PROVIDERS: "groq", GROQ_API_KEY: "gsk_TESTKEY000002" });
    mock.script("groq", [{ status: 400, body: { error: { message: "This model does not support response_format `json_schema`" } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
    const rf = mock.seen.map((s) => (s.body.response_format as { type: string } | undefined)?.type);
    assert.deepEqual(rf, ["json_schema", "json_object"]);
    mock.seen.length = 0;
    await ask(r);
    assert.equal((mock.seen[0].body.response_format as { type: string }).type, "json_object");
    const sys = (mock.seen[0].body.messages as { content: string }[])[0].content;
    assert.match(sys, /JSON Schema/);
  });

  test("Anthropic (existing provider) keeps working through the router", async () => {
    const r = makeRouter({ AI_PROVIDERS: "anthropic,gemini", ANTHROPIC_API_KEY: "sk-ant-TESTKEY0004", GEMINI_API_KEY: "AIzaTESTKEY000001" });
    const out = await ask(r);
    assert.equal(out.answer, "hi from anthropic");
    assert.equal(mock.seen[0].body.model, "claude-opus-5-5");
    assert.deepEqual(mock.seen[0].body.fallbacks, "default");
  });

  test("Anthropic overloaded (529) -> retry then failover to Gemini", async () => {
    const r = makeRouter({ AI_PROVIDERS: "anthropic,gemini", ANTHROPIC_API_KEY: "sk-ant-TESTKEY0004", GEMINI_API_KEY: "AIzaTESTKEY000001" });
    mock.script("anthropic", [{ status: 529, body: { type: "error", error: { type: "overloaded_error", message: "Overloaded" } } }, { status: 529, body: { type: "error", error: { type: "overloaded_error", message: "Overloaded" } } }]);
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
    assert.deepEqual(mock.seen.map((s) => s.provider), ["anthropic", "anthropic", "gemini"]);
  });
});

describe("safety and loop protection", () => {
  test("safety block is NOT retried on other providers", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ gemBlock: true }]);
    await assert.rejects(ask(r), (e: RouterError) => e.kind === "refusal" && e.status === 422);
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini"]);
  });

  test("everything failing ends after a bounded number of attempts (no infinite loop)", async () => {
    const r = makeRouter({ ...three, AI_MAX_ATTEMPTS: "4" });
    for (const p of ["gemini", "groq", "openrouter"]) mock.script(p, Array(10).fill({ status: 500 }));
    await assert.rejects(ask(r), (e: RouterError) => e.status === 503 && e.attempts === 4);
    assert.equal(mock.seen.length, 4);
  });

  test("each provider is visited at most once per request (no ping-pong)", async () => {
    const r = makeRouter({ ...three, AI_MAX_ATTEMPTS: "50", AI_MAX_RETRIES: "0" });
    for (const p of ["gemini", "groq", "openrouter"]) mock.script(p, Array(10).fill({ status: 502 }));
    await assert.rejects(ask(r));
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini", "groq", "openrouter"]);
  });

  test("circuit breaker opens after repeated failures and closes after the timeout", async () => {
    let t = 1_000_000;
    const r = makeRouter({ ...three, AI_CIRCUIT_THRESHOLD: "2", AI_CIRCUIT_OPEN_MS: "60000", AI_MAX_RETRIES: "0" });
    (r as unknown as { now: () => number }).now = () => t;
    mock.script("gemini", Array(5).fill({ status: 500 }));
    await ask(r);
    await ask(r);
    assert.equal(r.snapshot().providers.find((p) => p.id === "gemini")!.status, "circuit_open");
    mock.seen.length = 0;
    await ask(r);
    assert.deepEqual(mock.seen.map((s) => s.provider), ["groq"]);
    t += 61_000; // half-open: gemini gets a probe again
    mock.clear();
    mock.seen.length = 0;
    const out = await ask(r);
    assert.equal(out.answer, "hi from gemini");
  });

  test("deadline stops a hanging provider and fails over", async () => {
    const r = makeRouter({ ...three, AI_ATTEMPT_TIMEOUT_MS: "300", AI_MAX_RETRIES: "0" });
    mock.script("gemini", [{ hang: 2000 }]);
    const t0 = Date.now();
    const out = await ask(r);
    assert.equal(out.answer, "hi from groq");
    assert.ok(Date.now() - t0 < 1500);
  });

  test("local daily request limit skips the provider", async () => {
    const r = makeRouter({ ...three, GEMINI_DAILY_REQUEST_LIMIT: "1" });
    await ask(r);
    await ask(r);
    assert.deepEqual(mock.seen.map((s) => s.provider), ["gemini", "groq"]);
  });
});

describe("streaming", () => {
  const chat = (r: AIRouter) => r.streamText({ task: "coach", system: "sys", messages: [{ role: "user", content: "hi" }], tier: "balanced" });
  const collect = async (it: AsyncIterable<string>) => {
    let s = "";
    for await (const c of it) s += c;
    return s;
  };

  test("streams from the primary", async () => {
    const r = makeRouter(three);
    const s = await chat(r);
    assert.equal(s.provider, "gemini");
    assert.equal(await collect(s.chunks), "[gemini] streamed answer");
    await s.done;
    assert.ok(r.snapshot().providers.find((p) => p.id === "gemini")!.outputTokens > 0);
  });

  test("failure before the first token -> failover to the next provider", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ status: 429, body: { error: { message: "rate limit per minute" } } }]);
    const s = await chat(r);
    assert.equal(s.provider, "groq");
    assert.equal(await collect(s.chunks), "[groq] streamed answer");
  });

  test("failure after tokens were sent -> error, no switch to another provider mid-answer", async () => {
    const r = makeRouter(three);
    mock.script("gemini", [{ sse: ["part one ", "part two "], failAfter: true }]);
    const s = await chat(r);
    assert.equal(s.provider, "gemini");
    let got = "";
    await assert.rejects(async () => {
      for await (const c of s.chunks) got += c;
    });
    assert.equal(got, "part one part two ");
    assert.deepEqual(mock.seen.map((x) => x.provider), ["gemini"]);
  });

  test("OpenRouter and Anthropic streaming adapters", async () => {
    const r1 = makeRouter({ AI_PROVIDERS: "openrouter", OPENROUTER_API_KEY: "sk-or-TESTKEY000003" });
    assert.equal(await collect((await chat(r1)).chunks), "[openrouter] streamed answer");
    const r2 = makeRouter({ AI_PROVIDERS: "anthropic", ANTHROPIC_API_KEY: "sk-ant-TESTKEY0004" });
    assert.equal(await collect((await chat(r2)).chunks), "[anthropic] streamed answer");
  });
});
