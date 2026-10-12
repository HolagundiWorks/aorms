import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../../../lib/aqc/auth";
import { UUID_RE } from "../../../../../../../lib/aqc/contract";
import { chainRoot } from "../../../../../../../lib/aqc/drawing-chain";

/** GET: the revision log of a drawing — every revision in its chain, newest first. `id` may be any revision of the drawing. RLS-scoped. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return err(400, "bad_request", "Bad drawing id.");
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  const root = await chainRoot(ctx.supabase, id);
  if (!root) return err(404, "not_found", "Drawing not found.");
  const { data, error } = await ctx.supabase
    .from("drawings")
    .select("id, ref, title, rev_no, revision_note, is_current, file_name, size_bytes, review_status, created_at")
    .or(`id.eq.${root.rootId},root_id.eq.${root.rootId}`)
    .order("rev_no", { ascending: false })
    .limit(200);
  if (error) return err(502, "read_failed", "Couldn't read the revisions.");
  return NextResponse.json({
    rootId: root.rootId,
    revisions: (data ?? []).map((d) => ({
      id: d.id, ref: d.ref, title: d.title, rev: d.rev_no, note: d.revision_note, current: d.is_current,
      fileName: d.file_name, sizeBytes: d.size_bytes, review: d.review_status, createdAt: d.created_at,
    })),
  });
}
