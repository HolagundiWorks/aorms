/**
 * Core logic for the drawings upload — port of backend/src/modules/drawing/
 * upload.ts (see lib/actions/drawings.ts's uploadDrawing() for the full
 * account and the "use server" entry point Carbon's <Form> posts to).
 *
 * Deliberately NOT a "use server" file: Next.js resolves an imported
 * "use server" export through its Server Actions RPC dispatch even when
 * called directly from ordinary server code, which only works when that
 * dispatch can resolve the action's id — a plain function has no such
 * indirection, so this is what verification/tests import directly, and
 * what the real Server Action wrapper calls internally.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "../supabase/service";
import { enqueueJob, JobEnqueueError } from "../jobs/enqueue";
import { looksLikeDwg, looksLikeDxf, looksLikePdf, DRAWING_MAX_BYTES } from "./filetype";

export type DrawingActionState = { error: string } | null;

export const DRAWINGS_BUCKET = "esti-documents";

export async function uploadDrawingCore(
  supabase: SupabaseClient,
  formData: FormData,
): Promise<DrawingActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const rootId = String(formData.get("rootId") ?? "").trim() || null;
  const revisionNote = String(formData.get("revisionNote") ?? "").trim() || null;
  const file = formData.get("file");

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };
  if (!(file instanceof File) || file.size === 0) return { error: "A file is required." };
  if (file.size > DRAWING_MAX_BYTES) return { error: "File is too large (25 MB max)." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: project, error: projectError } = await supabase
    .from("project_offices")
    .select("id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError) return { error: projectError.message };
  if (!project) return { error: "Project not found." };

  const fileBuf = Buffer.from(await file.arrayBuffer());

  if (looksLikeDwg(fileBuf)) {
    return {
      error:
        "DWG is not supported — use Save As / Export to DXF (.dxf) from your CAD tool, or upload a PDF plan.",
    };
  }
  const isPdf = looksLikePdf(fileBuf);
  const isDxf = !isPdf && looksLikeDxf(fileBuf);
  if (!isPdf && !isDxf) {
    return {
      error: "Not a valid DXF or PDF — export as ASCII/Binary DXF (.dxf) or upload a plan PDF.",
    };
  }

  const fileHash = createHash("sha256").update(fileBuf).digest("hex");
  const storageKey = isPdf ? `pdf/${fileHash}.pdf` : `dxf/${fileHash}.dxf`;
  const contentType = isPdf ? "application/pdf" : "application/dxf";

  // Revision chaining: if rootId is given, supersede the current revision of
  // that drawing chain and bump the revision number.
  let revNo = 1;
  let chainRootId: string | null = null;
  if (rootId) {
    const { data: seed, error: seedError } = await supabase
      .from("drawings")
      .select("id, project_id, root_id")
      .eq("id", rootId)
      .maybeSingle();
    if (seedError) return { error: seedError.message };
    if (!seed) return { error: "Revision root not found." };
    if (seed.project_id !== projectId) return { error: "Revision root belongs to another project." };
    chainRootId = seed.root_id ?? seed.id;

    const { data: chain, error: chainError } = await supabase
      .from("drawings")
      .select("id, rev_no, is_current")
      .or(`id.eq.${chainRootId},root_id.eq.${chainRootId}`);
    if (chainError) return { error: chainError.message };
    revNo = Math.max(...(chain ?? []).map((d) => d.rev_no)) + 1;
    const currentIds = (chain ?? []).filter((d) => d.is_current).map((d) => d.id);
    if (currentIds.length) {
      const { error: unsetError } = await supabase
        .from("drawings")
        .update({ is_current: false })
        .in("id", currentIds);
      if (unsetError) return { error: unsetError.message };
    }
  }

  const serviceClient = createServiceRoleClient();
  const { error: uploadError } = await serviceClient.storage
    .from(DRAWINGS_BUCKET)
    .upload(storageKey, fileBuf, { contentType, upsert: true });
  if (uploadError) return { error: `Storage upload failed: ${uploadError.message}` };

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "drawing",
    p_default_prefix: "DRG",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("drawings")
    .insert({
      ref: refData,
      project_id: projectId,
      title,
      file_name: file.name,
      file_hash: fileHash,
      storage_key: storageKey,
      size_bytes: fileBuf.length,
      status: isPdf ? "READY" : "PENDING",
      rev_no: revNo,
      root_id: chainRootId,
      revision_note: revisionNote,
      is_current: true,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (isDxf) {
    try {
      await enqueueJob(
        "dxf_to_svg",
        { drawingId: inserted.id, bucket: DRAWINGS_BUCKET, storageKey, fileHash },
        undefined,
      );
    } catch (err) {
      // The upload itself succeeded (row + storage object both real) —
      // surface the queue failure without pretending the whole thing
      // failed, since re-clicking "Upload" would just re-upload the file.
      const message = err instanceof JobEnqueueError ? err.message : String(err);
      await supabase
        .from("drawings")
        .update({ status: "FAILED", error_text: `Queue: ${message}` })
        .eq("id", inserted.id);
      return { error: `Uploaded, but couldn't queue SVG conversion: ${message}` };
    }
  }

  await supabase.rpc("write_audit", {
    p_entity: "drawing",
    p_entity_id: inserted.id,
    p_action: chainRootId ? "UPLOAD_REVISION" : "UPLOAD",
    p_before: null,
    p_after: { projectId, ref: refData, fileHash, revNo, rootId: chainRootId, sourceKind: isPdf ? "PDF" : "DXF" },
  });

  return null;
}
