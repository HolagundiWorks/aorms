"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { parseCsvFile } from "../import-export/csv";
import { checkPlanCap, getFirmStudio, PLAN_CAPS } from "../platform/firm-studio";
import { toSafeErrorMessage } from "../security/safe-error";

export type ClientActionState = { error: string } | null;

const CLIENT_KINDS = new Set(["INDIVIDUAL", "COMPANY", "ARCHITECT_FIRM"]);

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role — see web/supabase/migrations/0002_capability_helper.sql)
 * — same set web/lib/actions/ai.ts's WRITE_TIER_ROLES uses. Mirrored here
 * as an explicit, friendly-error check in the Server Action (defense in
 * depth): the real authorization boundary is RLS
 * (migration 0082_clients_write_requires_capability.sql — "clients: staff
 * create" now checks has_capability('write') instead of the too-broad
 * is_office_staff(), which incorrectly included VIEWER and let a VIEWER
 * actually create client records, found by live QA 2026-09-20). Without
 * this app-level check, a VIEWER's submit would fail on the INSERT with a
 * raw RLS-denial error instead of a clear message.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export type ImportClientsState =
  | { error: string }
  | { imported: number; skipped: { row: number; message: string }[] }
  | null;

/**
 * Bulk CSV import (2026-09-14, demo-audit brief's bulk import/export
 * requirement) — same field rules as `createClientRecord` above (Name
 * required, Type defaults to Individual when blank but must be one of
 * the three real values when given), just applied per-row instead of
 * once. Partial import, not all-or-nothing: a bad row is skipped and
 * reported, the rest of the file still goes in — more useful for a
 * hand-edited spreadsheet than rejecting the whole file over one typo.
 * See components/aorms/ImportExportBar.tsx for the upload UI and
 * app/api/clients/{export,import-template}/route.ts for the CSV this
 * expects back (same column names this parses).
 */
export async function importClientsCsv(_prev: ImportClientsState, formData: FormData): Promise<ImportClientsState> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  const { data: authProfile } = user
    ? await authClient.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add clients — contact a firm owner or partner." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };

  const { rows, errors: parseErrors } = parseCsvFile(await file.text());
  if (rows.length === 0) return { error: "No rows found in that file." };

  const skipped: { row: number; message: string }[] = [];
  const toInsert: {
    name: string;
    kind: string;
    city: string | null;
    email: string | null;
    phone: string | null;
    contact_person: string | null;
  }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2; // +1 for 1-indexing, +1 for the header row
    const name = (row.Name ?? "").trim();
    const kindRaw = (row.Type ?? "").trim().toUpperCase();
    const kind = kindRaw || "INDIVIDUAL";

    if (!name) {
      skipped.push({ row: rowNumber, message: "Name is required." });
      return;
    }
    if (!CLIENT_KINDS.has(kind)) {
      skipped.push({ row: rowNumber, message: `Type "${kindRaw}" isn't Individual, Company, or Architect firm.` });
      return;
    }

    toInsert.push({
      name,
      kind,
      city: (row.City ?? "").trim() || null,
      email: (row.Email ?? "").trim() || null,
      phone: (row.Phone ?? "").trim() || null,
      contact_person: (row["Contact person"] ?? "").trim() || null,
    });
  });

  for (const message of parseErrors) skipped.push({ row: 0, message });

  const supabase = authClient;

  // Plan cap (2026-09-14, real pricing restructure) — trims toInsert to
  // however many slots remain rather than rejecting the whole file, so a
  // hand-edited spreadsheet still imports what fits; anything past the
  // cap is reported the same way an invalid row already is (skipped,
  // with why). No cap at all when this deployment isn't linked to a
  // studio, or the linked studio's plan has no client cap (only FREE
  // does — see firm-studio.ts's PLAN_CAPS).
  const studio = await getFirmStudio();
  const clientCap = studio ? PLAN_CAPS[studio.plan]?.client : null;
  if (studio && clientCap != null && toInsert.length > 0) {
    const { count: existingCount } = await supabase.from("clients").select("id", { count: "exact", head: true });
    const remaining = Math.max(0, clientCap - (existingCount ?? 0));
    const overflow = toInsert.splice(remaining);
    if (overflow.length > 0) {
      const message = `${studio.name}'s current plan is limited to ${clientCap} clients — upgrade to Studio or Professional on the AORMS Platform to add more.`;
      for (let i = 0; i < overflow.length; i++) skipped.push({ row: 0, message });
    }
  }

  if (toInsert.length === 0) return { imported: 0, skipped };

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert(toInsert)
    .select("id, name, kind, city, email, phone, contact_person");
  if (error) return { error: toSafeErrorMessage(error) };

  for (const row of inserted ?? []) {
    await supabase.rpc("write_audit", {
      p_entity: "client",
      p_entity_id: row.id,
      p_action: "CREATE",
      p_before: null,
      p_after: row,
    });
  }

  revalidatePath("/clients");
  return { imported: inserted?.length ?? 0, skipped };
}

export async function createClientRecord(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "INDIVIDUAL");
  const city = String(formData.get("city") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  // Who to actually call at a COMPANY/ARCHITECT_FIRM client — the record's
  // own name/email/phone are the organization's, not a named person's (an
  // INDIVIDUAL client doesn't need this: the client IS the contact). See
  // migration 0044's own header comment.
  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };

  const supabase = await createClient();

  // Server-side role check (2026-09-20 — VIEWER-can-create-clients bug
  // found by live QA): the actual authorization boundary is RLS
  // ("clients: staff create", fixed in migration
  // 0082_clients_write_requires_capability.sql to check has_capability
  // ('write') instead of the too-broad is_office_staff(), which
  // incorrectly included VIEWER). This app-level check is defense in
  // depth, and turns what would otherwise be a raw RLS-denial error into
  // a clear message.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: authProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add clients — contact a firm owner or partner." };
  }

  // Free-tier studio cap (2026-09-14) — see lib/platform/firm-studio.ts;
  // a no-op when this deployment isn't linked to a studio at all.
  const { count: existingCount } = await supabase.from("clients").select("id", { count: "exact", head: true });
  const capError = await checkPlanCap(existingCount ?? 0, "client");
  if (capError) return capError;

  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({ name, kind, city, email, phone, contact_person: contactPerson })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "client",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, kind, city, email, phone, contactPerson },
  });

  revalidatePath("/clients");
  return null;
}
