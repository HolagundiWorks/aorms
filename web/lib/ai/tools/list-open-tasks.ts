import type { AITool } from "./types";

/**
 * Only genuinely new query in the tool layer (the other two wrap
 * existing functions) — kept deliberately small: same shape as
 * ask-pulse.ts's own LIST_TASKS intent, read-only, RLS-scoped by the
 * caller's own session client.
 */
export const listOpenTasksTool: AITool = {
  name: "list_open_tasks",
  description: "List open (not-done) tasks, optionally filtered to the project already in context. Returns up to 15, ordered by due date.",
  parameters: { type: "object", properties: {} },
  async execute(_args, context) {
    let query = context.supabase
      .from("tasks")
      .select("title, status, priority, due_date, project_offices(title)")
      .neq("status", "DONE")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(15);
    if (context.projectId) query = query.eq("project_id", context.projectId);

    const { data, error } = await query;
    if (error) return `Couldn't list tasks: ${error.message}`;
    if (!data || data.length === 0) return "No open tasks.";

    return data
      .map((t) => {
        const project = Array.isArray(t.project_offices) ? t.project_offices[0] : (t.project_offices as { title: string } | null);
        return `${t.title} [${t.priority}, ${t.status}]${project ? ` — ${project.title}` : ""}${t.due_date ? ` — due ${t.due_date}` : ""}`;
      })
      .join("\n");
  },
};
