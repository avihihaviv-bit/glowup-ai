/**
 * Router configuration from server-side environment variables only.
 * Keys never leave the server: they are read here and passed straight to provider requests.
 */
import type { ProviderConfig, ProviderId, RouterConfig, Tier } from "./types";

type Env = Record<string, string | undefined>;

const list = (v: string | undefined) =>
  (v ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
const num = (v: string | undefined, d: number) => (v && Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v: string | undefined) => /^(1|true|yes)$/i.test(v ?? "");

function keys(env: Env, base: string) {
  return [...new Set([...list(env[`${base}_API_KEYS`]), ...list(env[`${base}_API_KEY`])])];
}

function tiers(env: Env, base: string, d: Record<Tier, string[]>): Record<Tier, string[]> {
  return {
    fast: list(env[`${base}_MODELS_FAST`]).length ? list(env[`${base}_MODELS_FAST`]) : d.fast,
    balanced: list(env[`${base}_MODELS_BALANCED`]).length ? list(env[`${base}_MODELS_BALANCED`]) : d.balanced,
    deep: list(env[`${base}_MODELS_DEEP`]).length ? list(env[`${base}_MODELS_DEEP`]) : d.deep,
  };
}

/**
 * Default model preferences. Providers retire models often, so:
 *  - each tier lists several candidates, newest/aliases first;
 *  - the router checks the account's real model list (where the provider offers one) and skips ids that don't exist;
 *  - every list can be overridden with <PROVIDER>_MODELS_FAST / _BALANCED / _DEEP / _VISION.
 */
export function loadConfig(env: Env = process.env): RouterConfig {
  const anthropicModel = env.ANTHROPIC_MODEL || "claude-opus-5-5";
  const providers: ProviderConfig[] = [
    {
      id: "anthropic",
      label: "Anthropic Claude",
      keys: keys(env, "ANTHROPIC"),
      separateQuota: bool(env.ANTHROPIC_KEYS_SEPARATE_QUOTA),
      baseUrl: env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
      models: tiers(env, "ANTHROPIC", { fast: [anthropicModel], balanced: [anthropicModel], deep: [anthropicModel] }),
      visionModels: list(env.ANTHROPIC_MODELS_VISION).length ? list(env.ANTHROPIC_MODELS_VISION) : [anthropicModel],
      visionCapable: () => true,
      dailyRequestLimit: num(env.ANTHROPIC_DAILY_REQUEST_LIMIT, 0) || undefined,
    },
    {
      id: "gemini",
      label: "Google Gemini",
      keys: keys(env, "GEMINI"),
      separateQuota: bool(env.GEMINI_KEYS_SEPARATE_QUOTA),
      baseUrl: env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
      models: tiers(env, "GEMINI", {
        fast: ["gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest"],
        balanced: ["gemini-flash-latest", "gemini-3.8-flash", "gemini-3.6-flash"],
        deep: ["gemini-pro-latest", "gemini-flash-latest", "gemini-3.8-flash"],
      }),
      visionModels: list(env.GEMINI_MODELS_VISION).length ? list(env.GEMINI_MODELS_VISION) : ["gemini-flash-latest", "gemini-3.8-flash", "gemini-pro-latest"],
      visionCapable: (m) => /gemini/i.test(m) && !/embedding|tts|image-generation/i.test(m),
      dailyRequestLimit: num(env.GEMINI_DAILY_REQUEST_LIMIT, 0) || undefined,
      maxImages: 16,
    },
    {
      id: "groq",
      label: "Groq",
      keys: keys(env, "GROQ"),
      separateQuota: bool(env.GROQ_KEYS_SEPARATE_QUOTA),
      baseUrl: env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
      models: tiers(env, "GROQ", {
        fast: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"],
        balanced: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"],
        deep: ["openai/gpt-oss-120b"],
      }),
      // Groq's vision models are preview-only and change often; set GROQ_MODELS_VISION to what your account lists.
      visionModels: list(env.GROQ_MODELS_VISION).length ? list(env.GROQ_MODELS_VISION) : ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b"],
      visionCapable: (m) => list(env.GROQ_MODELS_VISION).includes(m) || /qwen3\.\d+-27b|llama-4|vision|vl\b/i.test(m),
      dailyRequestLimit: num(env.GROQ_DAILY_REQUEST_LIMIT, 0) || undefined,
      maxImages: 5,
      extra: { maxTokens: env.GROQ_MAX_TOKENS ?? "" },
    },
    {
      id: "openrouter",
      label: "OpenRouter",
      keys: keys(env, "OPENROUTER"),
      separateQuota: bool(env.OPENROUTER_KEYS_SEPARATE_QUOTA),
      baseUrl: env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      models: tiers(env, "OPENROUTER", {
        fast: ["openai/gpt-oss-20b", "google/gemini-3.5-flash-lite"],
        balanced: ["google/gemini-3.8-flash", "openai/gpt-oss-120b"],
        deep: ["google/gemini-3.8-flash", "openai/gpt-oss-120b"],
      }),
      visionModels: list(env.OPENROUTER_MODELS_VISION).length ? list(env.OPENROUTER_MODELS_VISION) : ["google/gemini-3.8-flash", "google/gemini-3.6-flash"],
      visionCapable: (m) => list(env.OPENROUTER_MODELS_VISION).includes(m) || /gemini|claude|gpt-4o|gpt-5|vision|vl\b/i.test(m),
      dailyRequestLimit: num(env.OPENROUTER_DAILY_REQUEST_LIMIT, 0) || undefined,
      maxImages: 8,
      extra: {
        // Privacy: only route to OpenRouter endpoints that don't store or train on prompts (set "allow" to opt out).
        dataCollection: env.OPENROUTER_DATA_COLLECTION === "allow" ? "allow" : "deny",
        appUrl: env.OPENROUTER_APP_URL || "",
        maxTokens: env.OPENROUTER_MAX_TOKENS ?? "",
      },
    },
  ];

  const defaultOrder: ProviderId[] = ["anthropic", "gemini", "openrouter", "groq"];
  const order = list(env.AI_PROVIDERS).length ? list(env.AI_PROVIDERS) : defaultOrder;

  return {
    order: order.filter((id) => providers.some((p) => p.id === id)),
    maxAttempts: num(env.AI_MAX_ATTEMPTS, 6),
    deadlineMs: num(env.AI_DEADLINE_MS, 100_000),
    attemptTimeoutMs: num(env.AI_ATTEMPT_TIMEOUT_MS, 90_000),
    maxTransientRetries: num(env.AI_MAX_RETRIES, 1),
    backoffBaseMs: num(env.AI_BACKOFF_BASE_MS, 400),
    backoffCapMs: num(env.AI_BACKOFF_CAP_MS, 6_000),
    maxInlineWaitMs: num(env.AI_MAX_INLINE_WAIT_MS, 2_500),
    circuitThreshold: num(env.AI_CIRCUIT_THRESHOLD, 3),
    circuitOpenMs: num(env.AI_CIRCUIT_OPEN_MS, 60_000),
    providers,
  };
}

/** Providers that are in the order list and have at least one key, in priority order. */
export function activeProviders(cfg: RouterConfig) {
  return cfg.order.map((id) => cfg.providers.find((p) => p.id === id)!).filter((p) => p && p.keys.length > 0);
}
