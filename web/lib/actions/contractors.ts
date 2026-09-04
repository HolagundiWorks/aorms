"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type ContractorActionState = { error: string } | null;

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

  if (error) return { error: error.message };

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
