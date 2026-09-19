import { redactPii } from "./redact";
import { resolveAIProvider } from "./resolve-provider";

export type RunChatResult = {
  output: string;
  provider: string;
  model: string;
  tokenEstimate: number | null;
};

/**
 * The health-check -> chat -> redact -> fallback-on-either-failing shape
 * askEsti/generateAiDraft/generateDailyBrief (lib/actions/ai.ts,
 * lib/actions/daily-brief.ts) each currently hand-roll separately,
 * identically, against lib/ai/ollama.ts directly. Centralizing it here
 * doesn't change behavior for any of them — each call site still owns
 * its own fallback text and its own ai_runs bookkeeping (kind,
 * prompt_summary, sources) — it only removes the duplicated try/catch
 * shape and routes every future provider (phase 5/6) through one place.
 *
 * Deliberately NOT wired into those 3 call sites in this pass — they're
 * live, working, shipped features; migrating them onto this is a small,
 * separate, carefully-reviewed follow-up, not bundled into adding the
 * abstraction itself. See LIGHTWEIGHT-ARCHITECTURE-PLAN.md phase 5.
 */
export async function runChat(input: { system: string; user: string; fallback: string }): Promise<RunChatResult> {
  const aiProvider = resolveAIProvider();
  const health = await aiProvider.isHealthy();

  if (!health.ok) {
    return { output: input.fallback, provider: "mock", model: "template-fallback", tokenEstimate: null };
  }

  try {
    const { text, tokens } = await aiProvider.chat({ system: input.system, user: input.user });
    return { output: redactPii(text), provider: aiProvider.name, model: aiProvider.modelName, tokenEstimate: tokens };
  } catch {
    return { output: input.fallback, provider: "mock", model: "template-fallback", tokenEstimate: null };
  }
}
