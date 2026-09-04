"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { NUMERIC_FIELDS, TABLE_FIELDS, type ComplianceTable } from "../compliance-fields";

export type { ComplianceTable };

export type ComplianceActionState = { error: string } | null;

export async function createComplianceRow(
  table: ComplianceTable,
  _prev: ComplianceActionState,
  formData: FormData,
): Promise<ComplianceActionState> {
  const fields = TABLE_FIELDS[table];
  const row: Record<string, string | number | null> = {};

  for (const f of fields) {
    const raw = String(formData.get(f.name) ?? "").trim();
    if (f.required && !raw) {
      return { error: `${f.name.replace(/_/g, " ")} is required.` };
    }
    if (!raw) {
      row[f.name] = null;
      continue;
    }
    row[f.name] = NUMERIC_FIELDS.has(f.name) ? Number(raw) : raw;
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase.from(table).insert(row).select("id").single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: table,
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: row,
  });

  revalidatePath("/compliance");
  return null;
}
