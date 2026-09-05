"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { enqueueJob, JobEnqueueError } from "../jobs/enqueue";
import { getFirmForPdf } from "../jobs/firm";
import { uploadDrawingCore, type DrawingActionState } from "../drawings/upload";

export type { DrawingActionState };

/**
 * Port of backend/src/modules/drawing/upload.ts — the Phase 4 audit's own
 * flagged gap ("NOT ported here: the upload path itself... becomes a
 * Next.js Route Handler, not a table") and the reason drawings was the one
 * screen Phase 6 deliberately left unwired (no real svg_key could ever
 * exist without this). Built as a Server Action, not a Route Handler,
 * matching every other write in this codebase — Next.js Server Actions
 * accept a real `<input type="file">`'s File natively via FormData, no
 * separate multipart route needed the way Fastify required one.
 *
 * Content-addressed storage (sha256 of the bytes → storage key), the same
 * DWG/DXF/PDF magic-byte sniffing (extension checks are spoofable), and the
 * same revision-chaining semantics (a new upload against an existing
 * drawing's `rootId` supersedes the current revision and bumps `revNo`) all
 * port verbatim from the old Fastify route — see lib/drawings/upload.ts's
 * uploadDrawingCore() for the actual logic, kept in a plain (non-"use
 * server") module so it can be called directly, not just through the
 * Server Actions RPC dispatch this file's export goes through.
 *
 * Storage write uses the service-role client (bypasses Storage's own RLS),
 * matching the old backend's model exactly — a single service-level S3
 * client, not per-user storage ACLs. The DB insert stays on the normal
 * per-request client so RLS/audit behave like every other write here.
 */
export async function uploadDrawing(
  _prev: DrawingActionState,
  formData: FormData,
): Promise<DrawingActionState> {
  const supabase = await createClient();
  const result = await uploadDrawingCore(supabase, formData);
  if (!result) revalidatePath("/drawings");
  return result;
}

/**
 * Phase 6 enqueue boundary (docs/esti/NEXTJS-MIGRATION-PHASE6-AUDIT.md) —
 * the "drawing" render target uses `issue_pdf_key`/`issue_pdf_status`, not
 * every other target's `pdf_key`/`pdf_status` (worker/esti_worker/jobs/
 * pdf.py's `_render_drawing_issue` special case, watermarked, requires a
 * ready `svg_key`), so this doesn't go through `generatePdfForTarget()` —
 * that helper assumes the common column names. Now buildable at all only
 * because `uploadDrawing()` above is the thing that makes a real `svg_key`
 * possible (via the `dxf_to_svg` job it enqueues).
 */
export async function generateDrawingIssuePdf(drawingId: string): Promise<{ error: string } | null> {
  const supabase = await createClient();

  const { data: drawing, error: drawingError } = await supabase
    .from("drawings")
    .select("id, svg_key, status, issue_pdf_status")
    .eq("id", drawingId)
    .maybeSingle();
  if (drawingError) return { error: drawingError.message };
  if (!drawing) return { error: "Drawing not found." };
  if (drawing.issue_pdf_status === "PROCESSING") return { error: "PDF is already being generated." };
  if (drawing.status !== "READY" || !drawing.svg_key) {
    return { error: "SVG conversion hasn't finished yet — try again once status is READY." };
  }

  const firmResult = await getFirmForPdf(supabase);
  if (firmResult.error) return { error: firmResult.error };

  try {
    await enqueueJob(
      "render_pdf",
      { target: "drawing", id: drawingId, firm: firmResult.firm },
      undefined,
    );
  } catch (err) {
    if (err instanceof JobEnqueueError) return { error: err.message };
    throw err;
  }

  revalidatePath("/drawings");
  return null;
}
