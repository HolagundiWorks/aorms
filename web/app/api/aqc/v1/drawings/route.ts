import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../lib/aqc/auth";
import { DRAWING_MAX_BYTES } from "../../../../../lib/drawings/filetype";
import { uploadDrawingCore } from "../../../../../lib/drawings/upload";

/**
 * POST (multipart): the CAD program saves a drawing to a project — the desktop route to the same logic as the web upload
 * (`uploadDrawingCore`: DXF or PDF, 25 MB, DWG refused, revision chaining, SVG job). Fields: `projectOfficeId`, `title`,
 * `file`, optional `rootId` (supersede that drawing's chain → next revision) and `revisionNote`. Runs as the caller (RLS)
 * and needs `write`. Idempotent: the same file already current in the project answers 200 with the existing drawing.
 */
export async function POST(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  if ((await ctx.supabase.rpc("has_capability", { cap: "write" })).data !== true) return err(403, "forbidden", "Your role can't save drawings.");

  const form = await request.formData().catch(() => null);
  if (!form) return err(400, "bad_request", "Send the drawing as multipart form data.");
  const projectOfficeId = String(form.get("projectOfficeId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(projectOfficeId)) return err(400, "bad_request", "Bad projectOfficeId.");
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return err(400, "bad_request", "A file is required.");
  if (file.size > DRAWING_MAX_BYTES) return err(400, "bad_upload", "File is too large (25 MB max).");

  const hash = createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
  const existing = await ctx.supabase.from("drawings").select("id, ref, rev_no").eq("project_id", projectOfficeId).eq("file_hash", hash).eq("is_current", true).limit(1).maybeSingle();
  if (existing.data) return NextResponse.json({ id: existing.data.id, ref: existing.data.ref, revNo: existing.data.rev_no, unchanged: true });

  form.set("projectId", projectOfficeId); // uploadDrawingCore's field name
  let failed: Awaited<ReturnType<typeof uploadDrawingCore>>;
  try {
    failed = await uploadDrawingCore(ctx.supabase, form);
  } catch {
    return err(503, "storage_unavailable", "File storage isn't available right now. Try again shortly.");
  }
  if (failed) {
    const refused = /DWG|valid DXF|too large|required|not found/i.test(failed.error);
    return err(refused ? 400 : 502, refused ? "bad_upload" : "upload_failed", failed.error);
  }
  const made = await ctx.supabase.from("drawings").select("id, ref, rev_no").eq("project_id", projectOfficeId).eq("file_hash", hash).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return NextResponse.json({ id: made.data?.id ?? null, ref: made.data?.ref ?? null, revNo: made.data?.rev_no ?? 1, unchanged: false }, { status: 201 });
}
