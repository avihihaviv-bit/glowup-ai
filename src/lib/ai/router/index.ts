import "server-only";
import { loadConfig } from "./config";
import { ADAPTERS } from "./providers/registry";
import { AIRouter } from "./router";
import type { ProviderAdapter } from "./types";

export { RouterError, ProviderError } from "./errors";
export type { Part, Tier, Effort } from "./types";

const G = globalThis as unknown as { __glowupRouter?: AIRouter };

/** Process-wide router built from server environment variables. */
export function getRouter(): AIRouter {
  if (!G.__glowupRouter) {
    const cfg = loadConfig(process.env);
    const adapters: Record<string, ProviderAdapter> = {};
    for (const p of cfg.providers) if (ADAPTERS[p.id]) adapters[p.id] = ADAPTERS[p.id](p);
    G.__glowupRouter = new AIRouter(cfg, adapters);
  }
  return G.__glowupRouter;
}
