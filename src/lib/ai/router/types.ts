/**
 * Multi-provider AI router: shared types.
 * Nothing in this folder may be imported from client components — it reads API keys from process.env.
 */
import type { z } from "zod";

export type ProviderId = "anthropic" | "gemini" | "groq" | "openrouter" | (string & {});
export type Tier = "fast" | "balanced" | "deep";
export type Effort = "low" | "medium" | "high";

export type Part = { type: "text"; text: string } | { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** What a request needs from a model. Failover only goes to candidates that have all of these. */
export interface Needs {
  vision: boolean;
  json: boolean;
  stream: boolean;
}

export interface ModelSpec {
  id: string;
  vision: boolean;
  json: boolean;
  stream: boolean;
  /** max images per request the model accepts */
  maxImages?: number;
  preview?: boolean;
}

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface CallContext {
  key: string;
  model: ModelSpec;
  signal: AbortSignal;
  /** Rate-limit headers etc. reported back to the router */
  onQuota?: (q: QuotaHint) => void;
}

export interface QuotaHint {
  remainingRequests?: number;
  remainingTokens?: number;
  limitRequests?: number;
  resetRequests?: string;
}

export interface ObjectRequest<T extends z.ZodType = z.ZodType> {
  task: string;
  system: string;
  parts: Part[];
  schema: T;
  tier: Tier;
  /** Anthropic-only effort hint, preserved from the original implementation */
  effort?: Effort;
  /** Extra instruction appended when repairing invalid JSON */
  repairNote?: string;
}

export interface StreamRequest {
  task: string;
  system: string;
  messages: ChatTurn[];
  tier: Tier;
  effort?: Effort;
  maxTokens?: number;
}

export interface StreamHandle {
  /** text deltas */
  chunks: AsyncIterable<string>;
  /** resolves after the stream ends */
  done: Promise<{ usage?: Usage; refusal?: boolean }>;
  abort: () => void;
}

export interface ProviderAdapter {
  id: ProviderId;
  label: string;
  /** Returns the model ids this account can use, or null when listing isn't possible. */
  listModels?(key: string, signal: AbortSignal): Promise<{ id: string; vision?: boolean; json?: boolean }[] | null>;
  generateObject(req: ObjectRequest, ctx: CallContext, jsonMode: JsonMode): Promise<{ text: string; usage?: Usage; parsed?: unknown }>;
  stream(req: StreamRequest, ctx: CallContext): Promise<StreamHandle>;
  /** JSON strategies to try in order (first that the model accepts is remembered). */
  jsonModes: JsonMode[];
}

/** native = provider validates against the schema; object = JSON object mode + schema in prompt; prompt = schema in prompt only */
export type JsonMode = "native" | "object" | "prompt";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  keys: string[];
  /** true only when the keys belong to separate projects/plans with their own quotas */
  separateQuota: boolean;
  baseUrl: string;
  models: Record<Tier, string[]>;
  visionModels: string[];
  /** models known to accept images (for providers where discovery doesn't say) */
  visionCapable: (modelId: string) => boolean;
  dailyRequestLimit?: number;
  maxImages?: number;
  extra?: Record<string, string>;
}

export interface RouterConfig {
  order: ProviderId[];
  maxAttempts: number;
  deadlineMs: number;
  attemptTimeoutMs: number;
  maxTransientRetries: number;
  backoffBaseMs: number;
  backoffCapMs: number;
  /** wait in place for a 429 only if the provider asks for <= this */
  maxInlineWaitMs: number;
  circuitThreshold: number;
  circuitOpenMs: number;
  providers: ProviderConfig[];
}
