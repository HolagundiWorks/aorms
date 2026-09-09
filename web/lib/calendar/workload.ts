import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIcsFeed, type IcsEvent, type WorkloadCalendarScope } from "./ics";

/**
 * Workload calendar feed — port of backend/src/lib/workloadCalendar.ts's
 * loadWorkloadEvents()/buildWorkloadIcs(). Simpler here than the old
 * backend's version: this repo's own tasks.assignee_id already points
 * straight at profiles (Phase 2's own design decision), so there's no
 * teamMembers indirection or assignee-name-text fallback to port —
 * both existed only because the old schema's tasks.assignee was a plain
 * text column, which web/'s own tasks table was never given.
 */

const OFFICE_SCOPE_ROLES = new Set(["OWNER", "PARTNER", "SENIOR"]);

export function parseCalendarScope(raw: string | null): WorkloadCalendarScope {
  return raw === "office" ? "office" : "mine";
}

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  priority: string;
  project_offices: { ref: string; title: string } | { ref: string; title: string }[] | null;
};

export async function loadWorkloadEvents(
  supabase: SupabaseClient,
  userId: string,
  userRole: string,
  scope: WorkloadCalendarScope,
): Promise<IcsEvent[] | { error: string }> {
  if (scope === "office" && !OFFICE_SCOPE_ROLES.has(userRole)) {
    return { error: "Office workload calendar requires Partner or above." };
  }

  let query = supabase
    .from("tasks")
    .select("id, title, due_date, status, priority, project_offices(ref, title)")
    .not("due_date", "is", null)
    .neq("status", "DONE")
    .order("due_date");

  if (scope === "mine") {
    query = query.eq("assignee_id", userId);
  }

  const { data, error } = await query.returns<TaskRow[]>();
  if (error) return { error: error.message };

  return (data ?? [])
    .filter((r) => r.due_date)
    .map((r) => {
      const project = Array.isArray(r.project_offices) ? r.project_offices[0] : r.project_offices;
      const prefix = project?.ref ? `[${project.ref}] ` : "";
      const parts = [`Status: ${r.status}`, `Priority: ${r.priority}`, project?.title ? `Project: ${project.title}` : null].filter(
        (x): x is string => x !== null,
      );
      return {
        uid: `aorms-task-${r.id}@aorms.in`,
        date: r.due_date as string,
        summary: `${prefix}${r.title}`,
        description: parts.join("\n"),
      };
    });
}

export async function buildWorkloadIcs(
  supabase: SupabaseClient,
  userId: string,
  userRole: string,
  userName: string,
  scope: WorkloadCalendarScope,
): Promise<string | { error: string }> {
  const events = await loadWorkloadEvents(supabase, userId, userRole, scope);
  if (!Array.isArray(events)) return events;
  const calName = scope === "office" ? "AORMS — Office workload" : `AORMS — ${userName} tasks`;
  return buildIcsFeed(events, calName);
}
