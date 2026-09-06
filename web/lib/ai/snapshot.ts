import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ESTI agent's "Live snapshot" — a deliberately small, cheap set of counts
 * (not the full retrieval/context-assembly engine backend/src/lib/ai/
 * context.ts + operator-context.ts + repo-knowledge.ts implement, which
 * NEXTJS-MIGRATION-PHASE7-AUDIT.md flags as "the phase's real implementation
 * weight" and out of scope for this first slice). Uses the caller's own
 * request-scoped Supabase client, so every count is naturally filtered by
 * that user's RLS — no separate permission check needed here.
 */
export async function buildLiveSnapshot(supabase: SupabaseClient): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);

  const [leadsRes, projectsRes, overdueTasksRes, dueSoonTasksRes, invoicesRes] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "NEW"),
    supabase.from("project_offices").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "DONE")
      .lt("due_date", today),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .neq("status", "DONE")
      .gte("due_date", today),
    // Column-to-column comparison (paid < grand_total) isn't expressible
    // through PostgREST's filter operators (they compare a column to a
    // literal, not to another column) — approximate "outstanding" as issued-
    // but-not-yet-paid, same status set web/'s own invoices page treats as
    // open (lib/actions/invoices.ts).
    supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["DRAFT", "ISSUED"]),
  ]);

  const lines = [
    `New leads awaiting action: ${leadsRes.count ?? 0}`,
    `Active (non-archived) projects: ${projectsRes.count ?? 0}`,
    `Overdue tasks: ${overdueTasksRes.count ?? 0}`,
    `Open tasks due today or later: ${dueSoonTasksRes.count ?? 0}`,
    `Invoices not yet paid (draft/issued): ${invoicesRes.count ?? 0}`,
  ];

  return lines.join("\n");
}
