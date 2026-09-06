"use server";

import { createClient } from "../supabase/server";
import { callOllamaChat, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "../ai/ollama";
import { redactPii } from "../ai/redact";
import { ESTI_AGENT_SYSTEM } from "../ai/prompt";
import { buildLiveSnapshot } from "../ai/snapshot";

/**
 * ESTI agent — read-only Q&A mode (the "agent" half of the old backend's
 * draft-vs-agent split, see NEXTJS-MIGRATION-PHASE7-AUDIT.md). Any
 * authenticated office-hub user can ask; no `write` capability needed
 * (that's only for the draft-generation modes, not ported here).
 *
 * Every call is recorded in ai_runs (migration 0010, already live) —
 * provenance regardless of whether Ollama actually answered or the mock
 * fallback did, matching the old gateway's "always return something, be
 * honest about the fallback" behaviour (backend/src/lib/ai/gateway.ts).
 */

export type AskEstiState = { output: string; error?: string } | null;

const MOCK_FALLBACK =
  "ESTI's local AI model isn't reachable right now (Ollama may not be running, or the model isn't pulled yet). Ask your admin to check the Ollama container, or try again shortly.";

export async function askEsti(_prev: AskEstiState, formData: FormData): Promise<AskEstiState> {
  const question = String(formData.get("question") ?? "").trim();
  if (!question) return { output: "", error: "Ask a question first." };
  if (question.length > 2000) return { output: "", error: "Keep the question under 2000 characters." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { output: "", error: "Sign in to ask ESTI." };

  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();
  const snapshot = await buildLiveSnapshot(supabase);
  const userPrompt = `Live snapshot:\n${snapshot}\n\nQuestion: ${question}`;

  let output: string;
  let provider: string;
  let usedModel: string;
  let tokenEstimate: number | null = null;

  const health = await checkOllamaHealth({ baseUrl, model });
  if (health.ok) {
    try {
      const { text, tokens } = await callOllamaChat({
        baseUrl,
        model,
        system: ESTI_AGENT_SYSTEM,
        user: userPrompt,
      });
      output = redactPii(text);
      provider = "ollama";
      usedModel = model;
      tokenEstimate = tokens;
    } catch (err) {
      const hint = err instanceof Error ? err.message : "Ollama call failed";
      output = `${MOCK_FALLBACK}\n\n*(${hint.slice(0, 160)})*`;
      provider = "mock";
      usedModel = "template-fallback";
    }
  } else {
    output = `${MOCK_FALLBACK}\n\n*(${health.error ?? "model not ready"})*`;
    provider = "mock";
    usedModel = "template-fallback";
  }

  await supabase.from("ai_runs").insert({
    user_id: user.id,
    kind: "AGENT_QA",
    provider,
    model: usedModel,
    prompt_summary: question.slice(0, 200),
    sources: [],
    output_text: output,
    used_external_api: "false",
    token_estimate: tokenEstimate === null ? null : String(tokenEstimate),
  });

  return { output };
}
