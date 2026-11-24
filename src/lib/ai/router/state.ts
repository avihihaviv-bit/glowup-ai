/**
 * In-memory health, usage and log store (per server instance).
 * Stores counters and metadata only: never prompt content, responses or API keys.
 * Keys are referred to by a short SHA-256 fingerprint.
 */
import { createHash } from "node:crypto";
import type { ErrorKind } from "./errors";
import type { JsonMode, ProviderId, QuotaHint } from "./types";

export interface KeyState {
  id: string;
  requests: number;
  success: number;
  failures: number;
  disabledUntil: number;
  disabledReason?: string;
  cooldownUntil: number;
  lastUsedAt?: number;
}

export interface ProviderState {
  requests: number;
  success: number;
  failures: Partial<Record<ErrorKind, number>>;
  latencyTotal: number;
  latencyCount: number;
  inputTokens: number;
  outputTokens: number;
  consecutiveFailures: number;
  circuitOpenUntil: number;
  circuitTrips: number;
  cooldownUntil: number;
  cooldownReason?: string;
  lastError?: { kind: ErrorKind; status?: number; at: number; message: string };
  lastSuccessAt?: number;
  day: string;
  dayRequests: number;
  quota?: QuotaHint & { at: number };
  keys: Map<string, KeyState>;
  modelUnavailable: Map<string, number>;
  jsonMode: Map<string, JsonMode>;
  discovered?: { at: number; models: Map<string, { vision?: boolean; json?: boolean }> | null };
}

export interface LogEntry {
  at: number;
  requestId: string;
  task: string;
  provider: ProviderId;
  model?: string;
  keyId?: string;
  attempt: number;
  outcome: "success" | "error" | "retry" | "skip" | "stream_error";
  kind?: ErrorKind;
  status?: number;
  latencyMs?: number;
  note?: string;
}

const MAX_LOGS = 300;

interface Store {
  providers: Map<ProviderId, ProviderState>;
  logs: LogEntry[];
  lastServed?: { provider: ProviderId; model: string; at: number; task: string };
  startedAt: number;
  totalRequests: number;
}

const G = globalThis as unknown as { __glowupAiRouter?: Store };
export function store(): Store {
  if (!G.__glowupAiRouter) G.__glowupAiRouter = { providers: new Map(), logs: [], startedAt: Date.now(), totalRequests: 0 };
  return G.__glowupAiRouter;
}

/** Test helper: wipe all state. */
export function resetStore() {
  G.__glowupAiRouter = undefined;
}

const today = () => new Date().toISOString().slice(0, 10);

export function providerState(id: ProviderId): ProviderState {
  const s = store();
  let p = s.providers.get(id);
  if (!p) {
    p = { requests: 0, success: 0, failures: {}, latencyTotal: 0, latencyCount: 0, inputTokens: 0, outputTokens: 0, consecutiveFailures: 0, circuitOpenUntil: 0, circuitTrips: 0, cooldownUntil: 0, day: today(), dayRequests: 0, keys: new Map(), modelUnavailable: new Map(), jsonMode: new Map() };
    s.providers.set(id, p);
  }
  if (p.day !== today()) {
    p.day = today();
    p.dayRequests = 0;
  }
  return p;
}

export function keyId(provider: ProviderId, key: string, index: number) {
  return `${provider}#${index + 1}·${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}

export function keyState(provider: ProviderId, key: string, index: number): KeyState {
  const p = providerState(provider);
  const id = keyId(provider, key, index);
  let k = p.keys.get(id);
  if (!k) {
    k = { id, requests: 0, success: 0, failures: 0, disabledUntil: 0, cooldownUntil: 0 };
    p.keys.set(id, k);
  }
  return k;
}

export function log(e: Omit<LogEntry, "at">) {
  const entry: LogEntry = { at: Date.now(), ...e };
  const s = store();
  s.logs.push(entry);
  if (s.logs.length > MAX_LOGS) s.logs.splice(0, s.logs.length - MAX_LOGS);
  // Structured server log (Vercel / stdout). Metadata only.
  if (process.env.AI_ROUTER_LOG !== "off") console.info(JSON.stringify({ evt: "ai_router", ...entry }));
}
