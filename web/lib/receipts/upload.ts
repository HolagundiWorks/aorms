/**
 * Receipt upload for Office Expenses / Cash Book — same division-of-
 * labor pattern as lib/drawings/upload.ts's uploadDrawingCore(): the
 * caller (lib/actions/expenses.ts's createExpenseRecord(), running under
 * the caller-scoped, RLS-authorized client) is what actually authorizes
 * and inserts the `expenses` row; this module only ever touches Storage,
 * via the service-role client, and only after this function itself
 * already validated the file. Content-addressed by SHA-256 (same
 * dedup-by-hash approach as drawings) — receipts don't carry a project/
 * firm prefix in the key since the bucket is private with no listing
 * endpoint anywhere in the codebase (same reasoning CLAUDE.md's own
 * storage-isolation writeup already gives for esti-documents/
 * esti-site-inspections: every read goes through a signed URL minted
 * only after an RLS-scoped row lookup already succeeded, so two firms
 * colliding on a content-identical file's hash key is deduplicated
 * storage for provably-identical bytes, not a cross-firm leak).
 */
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "../supabase/service";
import { matchesClaimedType } from "../security/file-signature";

export const RECEIPTS_BUCKET = "esti-receipts";
const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

// lib/security/file-signature.ts's SIGNATURES already covers every type a
// receipt realistically is (photo of a paper receipt, or a PDF invoice/
// receipt) — no extension needed.
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type ReceiptUploadResult = { storageKey: string } | { error: string };

export async function uploadReceiptFile(file: File): Promise<ReceiptUploadResult> {
  if (file.size === 0) return { error: "Receipt file is empty." };
  if (file.size > MAX_RECEIPT_BYTES) return { error: "Receipt is too large (10MB max)." };

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { error: "Receipt must be a JPEG, PNG, WebP image, or PDF." };
  if (!(await matchesClaimedType(file, file.type))) {
    return { error: "That file doesn't look like a valid JPEG, PNG, WebP image, or PDF." };
  }

  const fileBuf = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(fileBuf).digest("hex");
  const storageKey = `${fileHash}.${ext}`;

  const serviceClient = createServiceRoleClient();
  const { error: uploadError } = await serviceClient.storage
    .from(RECEIPTS_BUCKET)
    .upload(storageKey, fileBuf, { contentType: file.type, upsert: true });
  if (uploadError) return { error: `Storage upload failed: ${uploadError.message}` };

  return { storageKey };
}
