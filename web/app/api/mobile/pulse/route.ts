import { NextResponse } from "next/server";
import { createBearerClient, bearerTokenFrom } from "../../../../lib/supabase/bearer";

/**
 * Pulse Dashboard summary for the Android widget/app (2026-09-19). One
 * round trip, small payload, cheap to poll from a home-screen widget's
 * periodic refresh (WorkManager, ~30 min per Android's own widget-update
 * floor) without shipping a Supabase client onto the device. Runs as the
 * caller (see lib/supabase/bearer.ts) — RLS is still the real access gate
 * here, this route just shapes the response and keeps the number of
 * queries a battery-constrained client has to fire down to one HTTP call.
 *
 * Deliberately narrow: counts only, no row payloads. The Android app's
 * "Update Task" screen fetches its own task list directly from Supabase
 * PostgREST (see docs — tasks already have client-safe RLS, no bespoke
 * endpoint needed for that), so this endpoint doesn't need to duplicate it.
 */
export async function GET(request: Request) {
  const token = bearerTokenFrom(request);
  if (!token) return NextResponse.json({ error: "Missing bearer token" }, { status: 401 });

  const supabase = createBearerClient(token);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  const [openTasks, myOpenTasks, overdueTasks, dueTodayTasks, criticalTasks, followUpInspections] = await Promise.all([
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").eq("assignee_id", user.id),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").lt("due_date", today),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").eq("due_date", today),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "DONE").in("priority", ["HIGH", "CRITICAL"]),
    supabase.from("site_inspection_reports").select("id", { count: "exact", head: true }).eq("follow_up_required", true).eq("status", "SUBMITTED"),
  ]);

  const firstError = [openTasks, myOpenTasks, overdueTasks, dueTodayTasks, criticalTasks, followUpInspections].find((r) => r.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    openTasks: openTasks.count ?? 0,
    myOpenTasks: myOpenTasks.count ?? 0,
    overdueTasks: overdueTasks.count ?? 0,
    dueTodayTasks: dueTodayTasks.count ?? 0,
    criticalTasks: criticalTasks.count ?? 0,
    inspectionsNeedingFollowUp: followUpInspections.count ?? 0,
  });
}
