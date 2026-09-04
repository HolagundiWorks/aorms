"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type ClientActionState = { error: string } | null;

export async function createClientRecord(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "INDIVIDUAL");
  const city = String(formData.get("city") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("clients")
    .insert({ name, kind, city, email, phone })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "client",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, kind, city, email, phone },
  });

  revalidatePath("/clients");
  return null;
}
