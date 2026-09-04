"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createPackage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const trade = String(formData.get("trade") ?? "").trim() || null;
  const tenderCloseDate = String(formData.get("tenderCloseDate") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "pmc_package",
    p_default_prefix: "PKG",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("pmc_packages")
    .insert({
      project_id: projectId,
      ref: refData,
      title,
      trade,
      tender_close_date: tenderCloseDate,
      status: "TENDERING",
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_package",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, ref: refData, title },
  });

  revalidatePath("/pmc-packages");
  return null;
}

export async function inviteContractor(
  packageId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const contractorId = String(formData.get("contractorId") ?? "").trim();
  if (!contractorId) return { error: "Select a contractor." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inserted, error } = await supabase
    .from("pmc_package_invites")
    .insert({ package_id: packageId, contractor_id: contractorId, invited_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_package_invite",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { packageId, contractorId },
  });

  revalidatePath(`/pmc-packages/${packageId}`);
  return null;
}

/** Opens the sealed bids — sets bids_opened_at, unsealing pmc_package_bids_sealed. */
export async function openPackageBids(packageId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("pmc_packages")
    .update({ bids_opened_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", packageId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_package",
    p_entity_id: packageId,
    p_action: "OPEN_BIDS",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/pmc-packages/${packageId}`);
  return {};
}

export async function awardPackage(
  packageId: string,
  bidId: string,
  contractorId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error: packageError } = await supabase
    .from("pmc_packages")
    .update({
      status: "AWARDED",
      contractor_id: contractorId,
      award_date: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", packageId);
  if (packageError) return { error: packageError.message };

  const { error: bidError } = await supabase.from("pmc_package_bids").update({ status: "AWARDED" }).eq("id", bidId);
  if (bidError) return { error: bidError.message };

  await supabase.rpc("write_audit", {
    p_entity: "pmc_package",
    p_entity_id: packageId,
    p_action: "AWARD",
    p_before: null,
    p_after: { bidId, contractorId },
  });

  revalidatePath(`/pmc-packages/${packageId}`);
  return {};
}
