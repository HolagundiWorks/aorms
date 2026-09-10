"use server";

/**
 * ESTI's Daily Brief (2026-09-10) — replaces the free-text "Ask ESTI"
 * question box in the header with an auto-generated brief grounded only
 * in the studio's own real data. See lib/ai/phraser.ts's header comment
 * and docs/esti/DASHBOARD-AND-ESTI-PHRASER.md for the full pipeline:
 * real Supabase queries (the retrieval) → a deterministic template (the
 * guaranteed-correct default) → an optional bounded Ollama rephrase
 * (reword only, never add facts) → PII redaction → display. The
 * free-text `askEsti` action (ai.ts) is left in place, just no longer
 * surfaced from the header.
 */
import { createClient } from "../supabase/server";
import { callOllamaChat, checkOllamaHealth, ollamaBaseUrlFromEnv, ollamaModelFromEnv } from "../ai/ollama";
import { redactPii } from "../ai/redact";
import { buildDailyBriefText, PHRASER_REPHRASE_SYSTEM } from "../ai/phraser";
import { hasRank } from "../auth/rank";
import {
  getAbsencesToday,
  getApprovalsSummary,
  getOpenClientRequests,
  getOpenConsultantRequests,
  getOpenContractorSubmissions,
  getOpenTenders,
  getReadyToBill,
  getAwaitingPayment,
} from "../dashboard/queries";
import { getTopPriorities } from "../dashboard/priority";

export type DailyBriefResult = { output: string; error?: string };

export async function generateDailyBrief(): Promise<DailyBriefResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { output: "", error: "Sign in to see your brief." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const includeFinancials = hasRank(profile?.role, 80);

  const today = new Date().toISOString().slice(0, 10);

  const [absences, readyToBill, awaitingPayment, approvals, clientRequests, consultantRequests, openTenders, contractorSubmissions, topPriorities] =
    await Promise.all([
      getAbsencesToday(supabase, today),
      getReadyToBill(supabase),
      getAwaitingPayment(supabase, today),
      getApprovalsSummary(supabase, today),
      getOpenClientRequests(supabase),
      getOpenConsultantRequests(supabase),
      getOpenTenders(supabase),
      getOpenContractorSubmissions(supabase),
      getTopPriorities(supabase, today),
    ]);

  const deterministicText = buildDailyBriefText({
    absences,
    readyToBillTotal: readyToBill.total,
    readyToBillCount: readyToBill.rows.length,
    awaitingPaymentTotal: awaitingPayment.total,
    awaitingPaymentCount: awaitingPayment.rows.length,
    approvals,
    clientRequests,
    consultantRequests,
    openTenders,
    contractorSubmissions,
    topPriorities,
    includeFinancials,
  });

  // Array shape (not one object) to match how /ai-runs/[id] already
  // renders `sources` (`Array.isArray(run.sources)` gate) — real
  // grounding metadata this time, unlike askEsti's always-empty `[]`.
  const sources = [
    { type: "absences", count: absences.length },
    { type: "readyToBill", count: readyToBill.rows.length },
    { type: "awaitingPayment", count: awaitingPayment.rows.length },
    { type: "pendingApprovals", count: approvals.pending.length },
    { type: "clientRequests", count: clientRequests.length },
    { type: "consultantRequests", count: consultantRequests.length },
    { type: "openTenders", count: openTenders.length },
    { type: "contractorSubmissions", count: contractorSubmissions.length },
    ...topPriorities.map((p) => ({ type: "topPriority", kind: p.kind, id: p.id })),
  ];

  const baseUrl = ollamaBaseUrlFromEnv();
  const model = ollamaModelFromEnv();

  let output = deterministicText;
  let provider = "template";
  let usedModel = "deterministic";
  let tokenEstimate: number | null = null;

  const health = await checkOllamaHealth({ baseUrl, model });
  if (health.ok) {
    try {
      const { text, tokens } = await callOllamaChat({
        baseUrl,
        model,
        system: PHRASER_REPHRASE_SYSTEM,
        user: deterministicText,
      });
      output = redactPii(text);
      provider = "ollama";
      usedModel = model;
      tokenEstimate = tokens;
    } catch {
      // Ollama reachable but the call itself failed — the deterministic
      // text is already correct and already assigned to `output`, so
      // just keep it rather than erroring the whole brief.
    }
  }

  await supabase.from("ai_runs").insert({
    user_id: user.id,
    kind: "DAILY_BRIEF",
    provider,
    model: usedModel,
    prompt_summary: "Daily Brief",
    sources,
    output_text: output,
    used_external_api: "false",
    token_estimate: tokenEstimate === null ? null : String(tokenEstimate),
  });

  return { output };
}
