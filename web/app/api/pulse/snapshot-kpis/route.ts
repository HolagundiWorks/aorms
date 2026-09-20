import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../../lib/supabase/service";
import { getAbsencesToday, getAwaitingPayment, getOpenClientRequests, getOpenConsultantRequests, getOpenTenders, getReadyToBill } from "../../../../lib/dashboard/queries";
import { getBlockedTasksCount, getCriticalTasksCount, getLowConfidenceTasksCount, getOpenMissingParamsCount } from "../../../../lib/pulse/queries";

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

  // Multi-tenancy (migration 0053+) — service-role bypasses RLS entirely,
  // so this must run once per firm. kpi_snapshots.firm_id is NOT NULL with
  // no usable default for a session-less caller, and its unique key is now
  // (firm_id, metric_key, captured_on) — an unscoped upsert would fail
  // outright, not just be imprecise. The 4 inline counts below are
  // explicitly firm-filtered.
  //
  // 2026-09-20 fix — the other 10 query helpers (lib/dashboard/queries.ts,
  // lib/pulse/queries.ts) used to be called with no firm filter at all:
  // designed for session-bound callers where RLS already scopes every
  // row, they silently returned the SAME cross-firm totals for every
  // firm's snapshot row once a second firm's data actually existed in
  // this project (which it now does). Each now takes an optional trailing
  // `firmId` that adds an explicit `.eq("firm_id", firmId)` — passed here,
  // left unset at every other (session-bound) call site.
  const { data: firms, error: firmsError } = await supabase.from("firms").select("id");
  if (firmsError) return NextResponse.json({ error: firmsError.message }, { status: 500 });

  try {
    let totalMetrics = 0;
    for (const firm of firms ?? []) {
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
        criticalCount,
        blockedTasksCount,
        openGapsCount,
        lowConfidenceCount,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("firm_id", firm.id).then((r) => r.count ?? 0),
        supabase.from("project_offices").select("id", { count: "exact", head: true }).eq("firm_id", firm.id).then((r) => r.count ?? 0),
        supabase.from("proposals").select("id", { count: "exact", head: true }).eq("firm_id", firm.id).then((r) => r.count ?? 0),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("firm_id", firm.id).neq("status", "DONE").then((r) => r.count ?? 0),
        getAbsencesToday(supabase, today, firm.id),
        getReadyToBill(supabase, firm.id),
        getAwaitingPayment(supabase, today, firm.id),
        getOpenClientRequests(supabase, firm.id),
        getOpenConsultantRequests(supabase, firm.id),
        getOpenTenders(supabase, firm.id),
        getCriticalTasksCount(supabase, firm.id),
        getBlockedTasksCount(supabase, firm.id),
        getOpenMissingParamsCount(supabase, firm.id),
        getLowConfidenceTasksCount(supabase, undefined, firm.id),
      ]);

      const criticalPulseCount = criticalCount;
      const openRequestCount = clientRequests.length + consultantRequests.length + openTenders.length;

      const rows: { metric_key: string; value: number; captured_on: string; firm_id: string }[] = [
        { metric_key: "pulse_critical", value: criticalPulseCount, captured_on: today, firm_id: firm.id },
        { metric_key: "pulse_blocked_tasks", value: blockedTasksCount, captured_on: today, firm_id: firm.id },
        { metric_key: "pulse_open_gaps", value: openGapsCount, captured_on: today, firm_id: firm.id },
        { metric_key: "pulse_low_confidence", value: lowConfidenceCount, captured_on: today, firm_id: firm.id },
        { metric_key: "finance_ready_to_bill", value: readyToBill.total, captured_on: today, firm_id: firm.id },
        { metric_key: "finance_awaiting_payment", value: awaitingPayment.total, captured_on: today, firm_id: firm.id },
        { metric_key: "team_absent_today", value: absences.length, captured_on: today, firm_id: firm.id },
        { metric_key: "team_open_tasks", value: openTaskCount, captured_on: today, firm_id: firm.id },
        { metric_key: "others_clients", value: clientCount, captured_on: today, firm_id: firm.id },
        { metric_key: "others_projects", value: projectCount, captured_on: today, firm_id: firm.id },
        { metric_key: "others_proposals", value: proposalCount, captured_on: today, firm_id: firm.id },
        { metric_key: "others_open_requests", value: openRequestCount, captured_on: today, firm_id: firm.id },
      ];

      const { error } = await supabase.from("kpi_snapshots").upsert(rows, { onConflict: "firm_id,metric_key,captured_on" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      totalMetrics += rows.length;
    }

    return NextResponse.json({ ok: true, captured_on: today, firmsProcessed: firms?.length ?? 0, metrics: totalMetrics });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Snapshot failed" }, { status: 500 });
  }
}
