"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type ContractActionState = { error: string } | null;

export async function createContractRecord(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  const title = String(formData.get("title") ?? "").trim();
  const party = String(formData.get("party") ?? "").trim();
  const contractType = String(formData.get("contractType") ?? "CLIENT");
  const valueRaw = String(formData.get("valuePaise") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim() || null;
  const endDate = String(formData.get("endDate") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!party) return { error: "Party is required." };

  const valuePaise = valueRaw ? Math.round(Number(valueRaw) * 100) : 0;
  if (!Number.isFinite(valuePaise)) return { error: "Value must be a number." };

  const supabase = await createClient();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "contract",
    p_default_prefix: "CTR",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("contracts")
    .insert({
      ref: refData,
      project_id: projectId,
      title,
      party,
      contract_type: contractType,
      value_paise: valuePaise,
      start_date: startDate,
      end_date: endDate,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "contract",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title, party, contractType, valuePaise },
  });

  revalidatePath("/contracts");
  return null;
}
