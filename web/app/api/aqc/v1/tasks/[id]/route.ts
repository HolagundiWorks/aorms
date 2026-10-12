import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../lib/aqc/auth";
import { TaskStatusBody, UUID_RE } from "../../../../../../lib/aqc/contract";

/** PATCH { status }: change a task's status (the only thing the CAD program may change). Needs `write`; audited like the web action. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return err(400, "bad_request", "Bad task id.");
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const body = TaskStatusBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Send { status: TODO | IN_PROGRESS | BLOCKED | DONE }.");
  if ((await ctx.supabase.rpc("has_capability", { cap: "write" })).data !== true) return err(403, "forbidden", "Your role can't change tasks.");

  const { data, error } = await ctx.supabase
    .from("tasks")
    .update({ status: body.data.status, completed_at: body.data.status === "DONE" ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, status")
    .maybeSingle();
  if (error) return err(502, "write_failed", "Couldn't change the task.");
  if (!data) return err(404, "not_found", "Task not found.");
  await ctx.supabase.rpc("write_audit", { p_entity: "task", p_entity_id: id, p_action: "UPDATE", p_before: null, p_after: { status: data.status, via: "aad" } });
  return NextResponse.json({ id: data.id, status: data.status });
}
