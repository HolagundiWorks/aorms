import { OllamaProvider } from "./providers/ollama-provider";
import type { AIProvider } from "./provider";

/**
 * Always returns the single self-hosted/local Ollama provider — the
 * only AI connector mode actually implemented today. Structured as a
 * resolver rather than a bare singleton so a firm-level connector choice
 * (customer_api / desktop_agent, mirroring tenant_databases' connector
 * modes on the platform project) can select a different provider later
 * without changing any caller of runChat(). See docs/esti/
 * LIGHTWEIGHT-ARCHITECTURE-PLAN.md phase 5/6 for what's still ahead of
 * this: neither a customer_api nor a desktop_agent provider exists yet.
 */
export function resolveAIProvider(): AIProvider {
  return new OllamaProvider();
}
