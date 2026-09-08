"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

/**
 * Numbering-pattern overrides — migration 0003's own header comment
 * flagged this as deferred ("NOT ported here: per-firm numbering
 * overrides"), closed by migration 0030_numbering_patterns.sql. RLS
 * gates writes to OWNER only, narrower than firm.ts's own OWNER/PARTNER
 * — not re-checked here, same "RLS is the real gate" convention as
 * every other domain in this codebase.
 */

export type NumberingPatternActionState = { error: string } | null;

export async function addNumberingPatternRecord(
  _prev: NumberingPatternActionState,
  formData: FormData,
): Promise<NumberingPatternActionState> {
  const scope = String(formData.get("scope") ?? "").trim().toLowerCase();
  const prefix = String(formData.get("prefix") ?? "").trim().toUpperCase() || null;
  const paddingRaw = String(formData.get("padding") ?? "").trim();

  if (!scope) return { error: "Scope is required." };
  if (!prefix && !paddingRaw) return { error: "Set a prefix, a padding, or both." };

  const padding = paddingRaw ? Number(paddingRaw) : null;
  if (padding !== null && (!Number.isInteger(padding) || padding < 2 || padding > 8)) {
    return { error: "Padding must be a whole number between 2 and 8." };
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("numbering_patterns")
    .upsert({ scope, prefix, padding }, { onConflict: "scope" })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "numbering_pattern",
    p_entity_id: inserted.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { scope, prefix, padding },
  });

  revalidatePath("/firm-settings");
  return null;
}

export async function removeNumberingPatternRecord(patternId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("numbering_patterns").delete().eq("id", patternId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "numbering_pattern",
    p_entity_id: patternId,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath("/firm-settings");
  return {};
}
