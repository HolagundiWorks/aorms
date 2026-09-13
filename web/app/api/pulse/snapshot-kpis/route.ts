import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../../lib/supabase/service";
import { getAbsencesToday, getAwaitingPayment, getOpenClientRequests, getOpenConsultantRequests, getOpenTenders, getReadyToBill } from "../../../../lib/dashboard/queries";
import { getBlockedTasks, getLowConfidenceTasks, getOpenMissingParams, getTopPriorityTasks } from "../../../../lib/pulse/queries";

/**
 * KPI daily snapshot (2026-09-14, shell/identity/KPI spec §21-22, migration
 * 0045) — bearer-secret gated, same shape as
 * app/api/pulse/recompute/route.ts (reuses its PULSE_RECOMPUTE_SECRET
 * rather than introducing a second cron secret that needs its own
 * production deployment step to actually take effect). Intended caller is
 * a daily pg_cron → pg_net job (see the follow-up migration once this is
 * confirmed working), but is equally callable on demand for testing.
 *
 * Computes the exact same 12 values app/(app)/pulse/page.tsx's own
 * pulseKpis/financeKpis/teamKpis/othersKpis show today, reusing that
 * page's own query helpers rather than re-deriving the numbers a second
 * way — the two are guaranteed to agree because they call the same
 * functions, not just because the logic happens to match right now.
 * Upserts on (metric_key, captured_on): re-running this on the same day
 * (e.g. a manual retry) overwrites that day's row instead of erroring on
 * the unique constraint or creating a duplicate.
 */
export async function POST(request: Request) {
  const secret = process.env.PULSE_RECOMPUTE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "PULSE_RECOMPUTE_SECRET is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const today = new Date().toISOString().slice(0, 10);

  try {
    const [
      clientCount,
      projectCount,
      proposalCount,
      openTaskCount,
      absences,
      readyToBill,
      awaitingPayment,
      clientRequests,
      consultantRequests,
      openTenders,
      pulseTasks,
      blockedTasks,
      missingParams,
      lowConfidenceTasks,
    ] = await Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
      supabase.from("project_offices").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
      supabase.from("proposals").select("id", { count: "exact", head: true }).then((r) => r.count ?? 0),
      supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").then((r) => r.count ?? 0),
      getAbsencesToday(supabase, today),
      getReadyToBill(supabase),
      getAwaitingPayment(supabase, today),
      getOpenClientRequests(supabase),
      getOpenConsultantRequests(supabase),
      getOpenTenders(supabase),
      getTopPriorityTasks(supabase),
      getBlockedTasks(supabase),
      getOpenMissingParams(supabase),
      getLowConfidenceTasks(supabase),
    ]);

    const criticalPulseCount = pulseTasks.filter((t) => t.band === "CRITICAL").length;
    const openRequestCount = clientRequests.length + consultantRequests.length + openTenders.length;

    const rows: { metric_key: string; value: number; captured_on: string }[] = [
      { metric_key: "pulse_critical", value: criticalPulseCount, captured_on: today },
      { metric_key: "pulse_blocked_tasks", value: blockedTasks.length, captured_on: today },
      { metric_key: "pulse_open_gaps", value: missingParams.length, captured_on: today },
      { metric_key: "pulse_low_confidence", value: lowConfidenceTasks.length, captured_on: today },
      { metric_key: "finance_ready_to_bill", value: readyToBill.total, captured_on: today },
      { metric_key: "finance_awaiting_payment", value: awaitingPayment.total, captured_on: today },
      { metric_key: "team_absent_today", value: absences.length, captured_on: today },
      { metric_key: "team_open_tasks", value: openTaskCount, captured_on: today },
      { metric_key: "others_clients", value: clientCount, captured_on: today },
      { metric_key: "others_projects", value: projectCount, captured_on: today },
      { metric_key: "others_proposals", value: proposalCount, captured_on: today },
      { metric_key: "others_open_requests", value: openRequestCount, captured_on: today },
    ];

    const { error } = await supabase.from("kpi_snapshots").upsert(rows, { onConflict: "metric_key,captured_on" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, captured_on: today, metrics: rows.length });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Snapshot failed" }, { status: 500 });
  }
}
