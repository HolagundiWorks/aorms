"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { parseCsvFile } from "../import-export/csv";
import { checkPlanCap, getFirmStudio, PLAN_CAPS } from "../platform/firm-studio";
import { toSafeErrorMessage } from "../security/safe-error";

export type ContractorActionState = { error: string } | null;

// Same code list as NewContractorForm.tsx's CATEGORIES — kept as a bare
// Set here (import validation only needs membership, not the display
// labels) rather than importing that Client Component's own map.
const CONTRACTOR_CATEGORIES = new Set([
  "CIVIL",
  "STRUCTURAL_STEEL",
  "MEP",
  "ELECTRICAL",
  "PLUMBING",
  "HVAC",
  "INTERIOR",
  "FACADE",
  "WATERPROOFING",
  "FLOORING",
  "PAINTING",
  "LANDSCAPE",
  "GENERAL",
  "OTHER",
]);

export type ImportContractorsState =
  | { error: string }
  | { imported: number; skipped: { row: number; message: string }[] }
  | null;

/**
 * Bulk CSV import (2026-09-14, demo-audit brief's bulk import/export
 * requirement) — same field rules as `createContractor` above, applied
 * per-row; a bad row is skipped and reported rather than failing the
 * whole file. See components/aorms/ImportExportBar.tsx for the upload UI
 * and app/api/contractors/{export,import-template}/route.ts for the CSV
 * this expects back.
 */
export async function importContractorsCsv(
  _prev: ImportContractorsState,
  formData: FormData,
): Promise<ImportContractorsState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };

  const { rows, errors: parseErrors } = parseCsvFile(await file.text());
  if (rows.length === 0) return { error: "No rows found in that file." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const skipped: { row: number; message: string }[] = [];
  const toInsert: {
    name: string;
    category: string;
    company_name: string | null;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    created_by_id: string | null;
  }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const name = (row.Name ?? "").trim();
    const categoryRaw = (row.Category ?? "").trim().toUpperCase();
    const category = categoryRaw || "GENERAL";

    if (!name) {
      skipped.push({ row: rowNumber, message: "Name is required." });
      return;
    }
    if (!CONTRACTOR_CATEGORIES.has(category)) {
      skipped.push({ row: rowNumber, message: `Category "${categoryRaw}" isn't a recognized category.` });
      return;
    }

    toInsert.push({
      name,
      category,
      company_name: (row["Company name"] ?? "").trim() || null,
      contact_person: (row["Contact person"] ?? "").trim() || null,
      email: (row.Email ?? "").trim() || null,
      phone: (row.Phone ?? "").trim() || null,
      city: (row.City ?? "").trim() || null,
      state: (row.State ?? "").trim() || null,
      created_by_id: user?.id ?? null,
    });
  });

  for (const message of parseErrors) skipped.push({ row: 0, message });

  // Plan cap (2026-09-14, real pricing restructure) — see
  // lib/platform/firm-studio.ts's own header comment; trims toInsert to
  // however many slots remain rather than rejecting the whole file. No
  // cap at all when this deployment isn't linked to a studio, or the
  // linked studio's plan has no contractor cap (only FREE does).
  const studio = await getFirmStudio();
  const contractorCap = studio ? PLAN_CAPS[studio.plan]?.contractor : null;
  if (studio && contractorCap != null && toInsert.length > 0) {
    const { count: existingCount } = await supabase.from("contractors").select("id", { count: "exact", head: true });
    const remaining = Math.max(0, contractorCap - (existingCount ?? 0));
    const overflow = toInsert.splice(remaining);
    if (overflow.length > 0) {
      const message = `${studio.name}'s current plan is limited to ${contractorCap} contractors — upgrade to Studio or Professional on the AORMS Platform to add more.`;
      for (let i = 0; i < overflow.length; i++) skipped.push({ row: 0, message });
    }
  }

  if (toInsert.length === 0) return { imported: 0, skipped };

  const { data: inserted, error } = await supabase
    .from("contractors")
    .insert(toInsert)
    .select("id, name, category");
  if (error) return { error: toSafeErrorMessage(error) };

  for (const row of inserted ?? []) {
    await supabase.rpc("write_audit", {
      p_entity: "contractor",
      p_entity_id: row.id,
      p_action: "CREATE",
      p_before: null,
      p_after: row,
    });
  }

  revalidatePath("/contractors");
  return { imported: inserted?.length ?? 0, skipped };
}

/**
 * createLogin (provisioning a CONTRACTOR-role portal login) isn't ported —
 * that's a Supabase Auth admin operation (creating an auth user + linking
 * contractor_id), a materially different kind of feature from this table's
 * own CRUD, and the Contractor Portal itself isn't built in this app yet.
 */
export async function createContractor(
  _prev: ContractorActionState,
  formData: FormData,
): Promise<ContractorActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim() || null;
  const contactPerson = String(formData.get("contactPerson") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!category) return { error: "Category is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Free-tier studio cap (2026-09-14) — see lib/platform/firm-studio.ts;
  // a no-op when this deployment isn't linked to a studio at all.
  const { count: existingCount } = await supabase.from("contractors").select("id", { count: "exact", head: true });
  const capError = await checkPlanCap(existingCount ?? 0, "contractor");
  if (capError) return capError;

  const { data: inserted, error } = await supabase
    .from("contractors")
    .insert({
      name,
      category,
      company_name: companyName,
      contact_person: contactPerson,
      email,
      phone,
      city,
      state,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "contractor",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, category },
  });

  revalidatePath("/contractors");
  return null;
}
