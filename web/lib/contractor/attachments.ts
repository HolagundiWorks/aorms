/**
 * Contractor attachments (tickets, progress photos, measurement sheets, bill backup). Same division of labour as
 * lib/receipts/upload.ts: the caller's RLS-scoped insert authorises the row; this module only touches Storage via the
 * service-role client after validating the file. Keys are `<projectId>/<sha256>.<ext>` in the private
 * `contractor-attachments` bucket; reads go through /api/contractor-file, which signs a URL only after an RLS lookup.
 */
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "../supabase/service";
import { matchesClaimedType } from "../security/file-signature";

export const CONTRACTOR_ATTACHMENTS_BUCKET = "contractor-attachments";
const MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export type AttachmentResult = { storageKey: string; fileName: string } | { error: string };

export async function uploadContractorAttachment(projectId: string, file: File): Promise<AttachmentResult> {
  if (file.size === 0) return { error: "The attachment is empty." };
  if (file.size > MAX_BYTES) return { error: "Attachment is too large (10MB max)." };
  const ext = TYPES[file.type];
  if (!ext) return { error: "Attach a JPEG, PNG, WebP image or a PDF." };
  if (!(await matchesClaimedType(file, file.type))) return { error: "That file doesn't look like a valid image or PDF." };
  const buf = Buffer.from(await file.arrayBuffer());
  const storageKey = `${projectId}/${createHash("sha256").update(buf).digest("hex")}.${ext}`;
  try {
    const { error } = await createServiceRoleClient().storage.from(CONTRACTOR_ATTACHMENTS_BUCKET).upload(storageKey, buf, { contentType: file.type, upsert: true });
    if (error) return { error: `Storage upload failed: ${error.message}` };
  } catch {
    return { error: "File storage isn't available right now. Send without the attachment or try again later." };
  }
  return { storageKey, fileName: file.name.replace(/[^\w.\- ]/g, "_").slice(0, 120) };
}
