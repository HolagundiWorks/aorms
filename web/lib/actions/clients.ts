"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { parseCsvFile } from "../import-export/csv";

export type ClientActionState = { error: string } | null;

const CLIENT_KINDS = new Set(["INDIVIDUAL", "COMPANY", "ARCHITECT_FIRM"]);

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

  if (toInsert.length === 0) return { imported: 0, skipped };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("clients")
    .insert(toInsert)
    .select("id, name, kind, city, email, phone, contact_person");
  if (error) return { error: error.message };

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
  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({ name, kind, city, email, phone, contact_person: contactPerson })
    .select("id")
    .single();

  if (error) return { error: error.message };

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
