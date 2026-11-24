/**
 * Provider registry. To add a provider:
 *  1. write an adapter implementing ProviderAdapter (or reuse openAICompatAdapter for OpenAI-compatible APIs);
 *  2. add its ProviderConfig in config.ts (keys env var, base URL, model tiers);
 *  3. register the factory below and add its id to AI_PROVIDERS.
 */
import type { ProviderAdapter, ProviderConfig } from "../types";
import { anthropicAdapter } from "./anthropic";
import { geminiAdapter } from "./gemini";
import { openAICompatAdapter } from "./openaiCompat";

type Factory = (cfg: ProviderConfig) => ProviderAdapter;

export const ADAPTERS: Record<string, Factory> = {
  anthropic: (c) => anthropicAdapter(c.baseUrl),
  gemini: (c) => geminiAdapter(c.baseUrl),
  groq: (c) =>
    openAICompatAdapter({ id: "groq", label: c.label, baseUrl: c.baseUrl, maxTokensField: "max_completion_tokens", maxOutputTokens: 16000 }),
  openrouter: (c) =>
    openAICompatAdapter({
      id: "openrouter",
      label: c.label,
      baseUrl: c.baseUrl,
      maxTokensField: "max_tokens",
      maxOutputTokens: 16000,
      richModelList: true,
      streamUsageOption: true,
      extraHeaders: { "X-Title": "GLOWUP AI", ...(c.extra?.appUrl ? { "HTTP-Referer": c.extra.appUrl } : {}) },
      // Only endpoints that support the parameters we send; never endpoints that keep prompt data unless opted in.
      extraBody: (mode) => ({ provider: { require_parameters: mode === "native" || mode === "object", data_collection: c.extra?.dataCollection ?? "deny" } }),
    }),
};
