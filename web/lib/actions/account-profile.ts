"use server";

/**
 * AORMS Identity — professional profile (2026-09-14, explicit user
 * request: "user needs to update their info, degree, qualification, COA
 * number, email, photo, nickname... standard profile requirements, also
 * they can upload their degree certificates... get auto profile update
 * on scope of work handled, and projects worked on start date and end
 * date at company, auto generated based on company usage... also any
 * software certifications, input the additional qualification").
 *
 * Three pieces:
 * 1. Editable profile fields (`account_profile_details`, 1:1 with
 *    `accounts` — platform migration 0029) — nickname, degree,
 *    qualification, COA registration number, additional qualifications,
 *    photo.
 * 2. Certificates (`account_certificates`, many per account) — degree
 *    certificates and software/other certifications, each an optional
 *    uploaded file.
 * 3. Auto-generated work history — deliberately has NO server action at
 *    all here, since it needs no write path: `getWorkHistory()` below is
 *    a pure read, computed straight from `studio_memberships` (which
 *    already records join date, leave date, and role for every Studio
 *    an account has ever belonged to) — exactly the "auto generated
 *    based on company usage" the request asked for, not a manually
 *    maintained field.
 *
 * Storage: a single private `account-documents` bucket (created via the
 * Storage API, not a migration — buckets aren't SQL objects), same "app-
 * code authorization via the service-role client, not Storage RLS
 * policies" precedent as aorms-web's own esti-documents bucket
 * (web/lib/actions/drawings.ts's uploadDrawingCore). A file is stored at
 * `{account_id}/{uuid}-{original filename}` — content-addressing (sha256
 * dedup, magic-byte sniffing) wasn't ported from that drawing pipeline
 * here since these are personal documents (photos, certificates), not
 * technical files feeding a worker job; the risk/reuse profile doesn't
 * call for it.
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

export type AccountProfileActionState = { error: string } | null;

const BUCKET = "account-documents";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches the bucket's own file_size_limit
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

async function requireAccountId(): Promise<{ accountId: string } | { error: string }> {
  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();
  if (!user) return { error: "Sign in to the AORMS Platform first." };

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService.from("accounts").select("id").eq("id", user.id).maybeSingle();
  if (!account) return { error: "This login isn't an AORMS Identity account." };

  return { accountId: account.id };
}

// ── Profile fields ───────────────────────────────────────────────────────

export async function updateAccountProfile(
  _prev: AccountProfileActionState,
  formData: FormData,
): Promise<AccountProfileActionState> {
  const gate = await requireAccountId();
  if ("error" in gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const { error } = await platformService.from("account_profile_details").upsert(
    {
      account_id: gate.accountId,
      nickname: String(formData.get("nickname") ?? "").trim() || null,
      degree: String(formData.get("degree") ?? "").trim() || null,
      qualification: String(formData.get("qualification") ?? "").trim() || null,
      coa_number: String(formData.get("coaNumber") ?? "").trim() || null,
      additional_qualifications: String(formData.get("additionalQualifications") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "account_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/identity/profile");
  return null;
}

export async function uploadAccountPhoto(
  _prev: AccountProfileActionState,
  formData: FormData,
): Promise<AccountProfileActionState> {
  const gate = await requireAccountId();
  if ("error" in gate) return gate;

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a photo to upload." };
  if (file.size > MAX_FILE_BYTES) return { error: "Photo is too large (10MB max)." };
  if (!ALLOWED_TYPES.has(file.type)) return { error: "Photo must be a JPEG, PNG, or WebP image." };

  const platformService = createPlatformServiceRoleClient();
  const key = `${gate.accountId}/photo-${crypto.randomUUID()}`;

  const { error: uploadError } = await platformService.storage.from(BUCKET).upload(key, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message };

  // Fetch the previous photo key so it can be removed after the new one
  // is confirmed written — never delete-then-upload (a failed upload
  // would leave the profile with no photo at all).
  const { data: existing } = await platformService.from("account_profile_details").select("photo_key").eq("account_id", gate.accountId).maybeSingle();
  const previousKey = existing?.photo_key ?? null;

  const { error: upsertError } = await platformService.from("account_profile_details").upsert(
    { account_id: gate.accountId, photo_key: key, updated_at: new Date().toISOString() },
    { onConflict: "account_id" },
  );
  if (upsertError) {
    await platformService.storage.from(BUCKET).remove([key]);
    return { error: upsertError.message };
  }

  if (previousKey) {
    await platformService.storage.from(BUCKET).remove([previousKey]);
  }

  revalidatePath("/identity/profile");
  return null;
}

// ── Certificates (degree + software/other) ─────────────────────────────

export async function addAccountCertificate(
  _prev: AccountProfileActionState,
  formData: FormData,
): Promise<AccountProfileActionState> {
  const gate = await requireAccountId();
  if ("error" in gate) return gate;

  const kind = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const issuer = String(formData.get("issuer") ?? "").trim();
  const issuedOn = String(formData.get("issuedOn") ?? "").trim();
  if (!["DEGREE", "SOFTWARE", "OTHER"].includes(kind)) return { error: "Choose a certificate type." };
  if (!title) return { error: "Title is required." };

  const platformService = createPlatformServiceRoleClient();

  let fileKey: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) return { error: "File is too large (10MB max)." };
    if (!ALLOWED_TYPES.has(file.type)) return { error: "File must be a JPEG, PNG, WebP image, or PDF." };
    fileKey = `${gate.accountId}/cert-${crypto.randomUUID()}`;
    const { error: uploadError } = await platformService.storage.from(BUCKET).upload(fileKey, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await platformService.from("account_certificates").insert({
    account_id: gate.accountId,
    kind,
    title,
    issuer: issuer || null,
    issued_on: issuedOn || null,
    file_key: fileKey,
  });
  if (error) {
    if (fileKey) await platformService.storage.from(BUCKET).remove([fileKey]);
    return { error: error.message };
  }

  revalidatePath("/identity/profile");
  return null;
}

export async function removeAccountCertificate(certificateId: string): Promise<{ error?: string }> {
  const gate = await requireAccountId();
  if ("error" in gate) return gate;

  const platformService = createPlatformServiceRoleClient();
  const { data: certificate } = await platformService
    .from("account_certificates")
    .select("file_key")
    .eq("id", certificateId)
    .eq("account_id", gate.accountId)
    .maybeSingle();
  if (!certificate) return { error: "Certificate not found." };

  const { error } = await platformService.from("account_certificates").delete().eq("id", certificateId).eq("account_id", gate.accountId);
  if (error) return { error: error.message };

  if (certificate.file_key) {
    await platformService.storage.from(BUCKET).remove([certificate.file_key]);
  }

  revalidatePath("/identity/profile");
  return {};
}

/**
 * Signed URL for a private Storage object (photo or certificate file) —
 * the bucket is private, so neither can be linked to directly; a fresh,
 * short-lived signed URL is generated per render instead.
 */
export async function getSignedFileUrl(fileKey: string): Promise<string | null> {
  const platformService = createPlatformServiceRoleClient();
  const { data, error } = await platformService.storage.from(BUCKET).createSignedUrl(fileKey, 60 * 10);
  if (error || !data) return null;
  return data.signedUrl;
}

// ── Auto-generated work history — pure read, no write path at all ──────

export type WorkHistoryEntry = {
  membershipId: string;
  studioId: string;
  studioName: string;
  studioPublicId: string;
  role: string;
  startedAt: string | null;
  endedAt: string | null;
  isCurrent: boolean;
};

/**
 * "Auto generated based on company usage" — every field here comes
 * straight from `studio_memberships`, which already records exactly
 * this (join date, leave date, role) the moment someone joins/leaves a
 * Studio elsewhere in the app. Nothing here is manually entered.
 */
export async function getWorkHistory(accountId: string): Promise<WorkHistoryEntry[]> {
  const platformService = createPlatformServiceRoleClient();
  const { data } = await platformService
    .from("studio_memberships")
    .select("id, role, status, created_at, activated_at, left_at, studios(id, name, public_id)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  return (data ?? [])
    .map((m) => {
      const studio = (Array.isArray(m.studios) ? m.studios[0] : m.studios) as { id: string; name: string; public_id: string } | null;
      if (!studio) return null;
      return {
        membershipId: m.id,
        studioId: studio.id,
        studioName: studio.name,
        studioPublicId: studio.public_id,
        role: m.role,
        startedAt: m.activated_at ?? m.created_at,
        endedAt: m.left_at,
        isCurrent: m.status === "ACTIVE",
      };
    })
    .filter((entry): entry is WorkHistoryEntry => entry !== null);
}
