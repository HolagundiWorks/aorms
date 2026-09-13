"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { parseCsvFile } from "../import-export/csv";

/**
 * Consultants — the staff-facing directory + engagement CRUD side of
 * migration 0021 (which only built the Collaborator Portal's read/submit
 * side; the directory itself had RLS from day one but no UI, same gap
 * `/contractors` had before this). `createLogin` (provisioning a
 * CONSULTANT-role portal login) isn't ported here either — that's a
 * Supabase Auth admin operation, a materially different kind of feature
 * from this table's own CRUD.
 */

export type ConsultantActionState = { error: string } | null;

export async function createConsultant(
  _prev: ConsultantActionState,
  formData: FormData,
): Promise<ConsultantActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const discipline = String(formData.get("discipline") ?? "").trim();
  const firm = String(formData.get("firm") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!discipline) return { error: "Discipline is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("consultants")
    .insert({ name, discipline, firm, email, phone })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "consultant",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, discipline },
  });

  revalidatePath("/consultants");
  return null;
}

export type ImportConsultantsState =
  | { error: string }
  | { imported: number; skipped: { row: number; message: string }[] }
  | null;

/**
 * Bulk CSV import (2026-09-14, demo-audit brief's bulk import/export
 * requirement) — same field rules as `createConsultant` above, applied
 * per-row; a bad row is skipped and reported rather than failing the
 * whole file. See components/aorms/ImportExportBar.tsx for the upload UI
 * and app/api/consultants/{export,import-template}/route.ts for the CSV
 * this expects back.
 */
export async function importConsultantsCsv(
  _prev: ImportConsultantsState,
  formData: FormData,
): Promise<ImportConsultantsState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };

  const { rows, errors: parseErrors } = parseCsvFile(await file.text());
  if (rows.length === 0) return { error: "No rows found in that file." };

  const skipped: { row: number; message: string }[] = [];
  const toInsert: { name: string; discipline: string; firm: string | null; email: string | null; phone: string | null }[] = [];

  rows.forEach((row, i) => {
    const rowNumber = i + 2;
    const name = (row.Name ?? "").trim();
    const discipline = (row.Discipline ?? "").trim();

    if (!name) {
      skipped.push({ row: rowNumber, message: "Name is required." });
      return;
    }
    if (!discipline) {
      skipped.push({ row: rowNumber, message: "Discipline is required." });
      return;
    }

    toInsert.push({
      name,
      discipline,
      firm: (row.Firm ?? "").trim() || null,
      email: (row.Email ?? "").trim() || null,
      phone: (row.Phone ?? "").trim() || null,
    });
  });

  for (const message of parseErrors) skipped.push({ row: 0, message });

  if (toInsert.length === 0) return { imported: 0, skipped };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("consultants")
    .insert(toInsert)
    .select("id, name, discipline");
  if (error) return { error: error.message };

  for (const row of inserted ?? []) {
    await supabase.rpc("write_audit", {
      p_entity: "consultant",
      p_entity_id: row.id,
      p_action: "CREATE",
      p_before: null,
      p_after: row,
    });
  }

  revalidatePath("/consultants");
  return { imported: inserted?.length ?? 0, skipped };
}

export type EngagementActionState = { error: string } | null;

export async function createEngagement(
  _prev: EngagementActionState,
  formData: FormData,
): Promise<EngagementActionState> {
  const consultantId = String(formData.get("consultantId") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const scope = String(formData.get("scope") ?? "").trim() || null;
  const agreedFeeRaw = String(formData.get("agreedFeePaise") ?? "0").trim();
  const status = String(formData.get("status") ?? "ENGAGED");

  if (!consultantId) return { error: "Missing consultant." };
  if (!projectId) return { error: "Project is required." };

  const agreedFeePaise = agreedFeeRaw ? Math.round(Number(agreedFeeRaw) * 100) : 0;
  if (!Number.isFinite(agreedFeePaise)) return { error: "Agreed fee must be a number." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("engagements")
    .insert({ consultant_id: consultantId, project_id: projectId, scope, agreed_fee_paise: agreedFeePaise, status })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "engagement",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { consultantId, projectId, scope, agreedFeePaise },
  });

  revalidatePath(`/consultants/${consultantId}`);
  return null;
}

const ENGAGEMENT_STATUSES = ["ENGAGED", "COMPLETED", "TERMINATED"];

export async function updateEngagementStatus(
  engagementId: string,
  consultantId: string,
  status: string,
): Promise<{ error?: string }> {
  if (!ENGAGEMENT_STATUSES.includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("engagements")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", engagementId);
  if (error) return { error: error.message };

  revalidatePath(`/consultants/${consultantId}`);
  return {};
}

export async function recordEngagementPayment(
  _prev: EngagementActionState,
  formData: FormData,
): Promise<EngagementActionState> {
  const engagementId = String(formData.get("engagementId") ?? "").trim();
  const consultantId = String(formData.get("consultantId") ?? "").trim();
  const amountRaw = String(formData.get("amountPaise") ?? "0").trim();

  if (!engagementId) return { error: "Missing engagement." };
  const amountPaise = amountRaw ? Math.round(Number(amountRaw) * 100) : 0;
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) return { error: "Enter a valid payment amount." };

  const supabase = await createClient();
  const { data: engagement, error: fetchError } = await supabase
    .from("engagements")
    .select("paid_paise")
    .eq("id", engagementId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!engagement) return { error: "Engagement not found." };

  const { error } = await supabase
    .from("engagements")
    .update({ paid_paise: engagement.paid_paise + amountPaise, updated_at: new Date().toISOString() })
    .eq("id", engagementId);
  if (error) return { error: error.message };

  revalidatePath(`/consultants/${consultantId}`);
  return null;
}
