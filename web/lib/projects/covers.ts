/**
 * Project cover images — storage helpers. Private `project-covers` bucket, no
 * direct client access: writes go through lib/actions/project-covers.ts (which
 * authorizes first), reads go through short-lived signed URLs minted here only
 * for keys the caller's RLS-scoped query already returned. Same division of
 * labour as lib/receipts/upload.ts.
 */
import { createHash } from "node:crypto";
import { createServiceRoleClient } from "../supabase/service";
import { matchesClaimedType } from "../security/file-signature";

export const COVERS_BUCKET = "project-covers";
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type CoverUploadResult = { key: string } | { error: string };

export async function uploadCoverImage(projectId: string, file: File): Promise<CoverUploadResult> {
  if (file.size === 0) return { error: "That image file is empty." };
  if (file.size > MAX_COVER_BYTES) return { error: "Cover image is too large (5MB max)." };
  const ext = ALLOWED[file.type];
  if (!ext) return { error: "Cover image must be a JPEG, PNG or WebP." };
  if (!(await matchesClaimedType(file, file.type))) return { error: "That file doesn't look like a valid JPEG, PNG or WebP image." };

  const buf = Buffer.from(await file.arrayBuffer());
  const key = `${projectId}/${createHash("sha256").update(buf).digest("hex")}.${ext}`;
  const { error } = await createServiceRoleClient().storage.from(COVERS_BUCKET).upload(key, buf, { contentType: file.type, upsert: true });
  if (error) return { error: "Couldn't store the image — please try again." };
  return { key };
}

/** Best-effort cleanup of a replaced/removed cover; a failure only leaves an orphan object, never a broken project. */
export async function deleteCoverImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  await createServiceRoleClient().storage.from(COVERS_BUCKET).remove([key]).catch(() => undefined);
}

/** key → signed URL for every key that could be signed; missing entries simply render without an image. */
export async function signCoverUrls(keys: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  const out = new Map<string, string>();
  if (unique.length === 0) return out;
  const { data } = await createServiceRoleClient().storage.from(COVERS_BUCKET).createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  for (const row of data ?? []) if (row.path && row.signedUrl) out.set(row.path, row.signedUrl);
  return out;
}
