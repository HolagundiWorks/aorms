import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../lib/aqc/auth";
import { NotePatchBody, UUID_RE } from "../../../../../../lib/aqc/contract";

/** PATCH { body?, status? }: edit a note's text (author, owner or partner) or resolve / reopen it (anyone with `write`). Needs `write`. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return err(400, "bad_request", "Bad note id.");
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const patch = NotePatchBody.safeParse(await request.json().catch(() => null));
  if (!patch.success) return err(400, "bad_request", "Send { body? (1-2000 chars), status? (OPEN | RESOLVED) }.");
  if ((await ctx.supabase.rpc("has_capability", { cap: "write" })).data !== true) return err(403, "forbidden", "Your role can't change notes.");

  const cur = await ctx.supabase.from("drawing_notes").select("id, author_id").eq("id", id).maybeSingle();
  if (!cur.data) return err(404, "not_found", "Note not found.");
  // Anyone with `write` may resolve / reopen; editing the text is the author's (or an owner's / partner's, enforced by RLS too).
  if (patch.data.body !== undefined && cur.data.author_id !== ctx.user.id && !["OWNER", "PARTNER"].includes(ctx.role)) {
    return err(403, "forbidden", "Only the author can edit a note's text.");
  }
  const upd = ctx.supabase.from("drawing_notes").update(patch.data).eq("id", id);
  const { data, error } = await upd.select("id, status, updated_at").maybeSingle();
  if (error || !data) return err(403, "forbidden", "Couldn't change the note.");
  return NextResponse.json({ id: data.id, status: data.status, updatedAt: data.updated_at });
}
