"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type MasterPlanActionState = { error: string } | null;

/**
 * Metadata only, same register-only pattern as drawings.ts — no upload
 * Route Handler exists in this app yet. file_key is NOT NULL in the
 * schema (migration 0011), so a register-only row needs a placeholder.
 */
export async function createMasterPlan(
  _prev: MasterPlanActionState,
  formData: FormData,
): Promise<MasterPlanActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "PDF";
  const fileName = String(formData.get("fileName") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!fileName) return { error: "File name is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const placeholder = `pending-${Date.now()}`;

  const { data: inserted, error } = await supabase
    .from("master_plans")
    .insert({
      name,
      category,
      file_key: placeholder,
      file_name: fileName,
      uploaded_by_id: user?.id ?? null,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "master_plan",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, category, fileName },
  });

  revalidatePath("/master-plans");
  return null;
}
