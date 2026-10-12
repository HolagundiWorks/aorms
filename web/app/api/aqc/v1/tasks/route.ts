import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../lib/aqc/auth";
import { UUID_RE } from "../../../../../lib/aqc/contract";
import { chainRoot } from "../../../../../lib/aqc/drawing-chain";

/**
 * GET ?projectOfficeId=…[&drawingId=…]: the project's tasks and programme milestones for the CAD program. With `drawingId`
 * (any revision) the tasks are those tied to that drawing's chain; without it, all of the project's tasks. RLS-scoped.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectOfficeId = url.searchParams.get("projectOfficeId") ?? "";
  const drawingId = url.searchParams.get("drawingId");
  if (!UUID_RE.test(projectOfficeId) || (drawingId !== null && !UUID_RE.test(drawingId))) return err(400, "bad_request", "Bad projectOfficeId or drawingId.");
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const { supabase } = ctx;

  let tasks = supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, start_date, drawing_id, assignee_id, profiles!tasks_assignee_id_fkey(full_name)")
    .eq("project_id", projectOfficeId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(500);
  if (drawingId) {
    const root = await chainRoot(supabase, drawingId);
    if (!root) return err(404, "not_found", "Drawing not found.");
    if (root.projectId !== projectOfficeId) return err(400, "bad_request", "That drawing belongs to another project.");
    // The chain's every revision id, so a task tied to an older revision still shows.
    const { data: chain } = await supabase.from("drawings").select("id").or(`id.eq.${root.rootId},root_id.eq.${root.rootId}`).limit(500);
    tasks = tasks.in("drawing_id", (chain ?? []).map((d) => d.id));
  }
  const [t, m] = await Promise.all([
    tasks,
    supabase.from("pmc_milestones").select("id, ref, title, planned_date, actual_date, percent_complete, status").eq("project_id", projectOfficeId).order("sort_order").limit(500),
  ]);
  if (t.error || m.error) return err(502, "read_failed", "Couldn't read the tasks.");
  return NextResponse.json({
    tasks: (t.data ?? []).map((r) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      return { id: r.id, title: r.title, description: r.description, status: r.status, priority: r.priority, dueDate: r.due_date, startDate: r.start_date, drawingId: r.drawing_id, assigneeId: r.assignee_id, assignee: p?.full_name ?? null };
    }),
    milestones: (m.data ?? []).map((r) => ({ id: r.id, ref: r.ref, title: r.title, plannedDate: r.planned_date, actualDate: r.actual_date, percentComplete: r.percent_complete, status: r.status })),
  });
}
