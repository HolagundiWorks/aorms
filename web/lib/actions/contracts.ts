"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { logAutoDocumentIssue } from "../document-issues-log";
import { toSafeErrorMessage } from "../security/safe-error";

export type ContractActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role) — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES
 * uses, mirrored here as an explicit, friendly-error check in the Server
 * Action (defense in depth): the real authorization boundary is RLS
 * (`contracts: staff write`, migration 0085_write_policies_require_capability.sql).
 * Added 2026-09-21 in the same sweep that found the matching UI gap on
 * `/contracts`' "Add contract" trigger.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

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
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const { data: authProfile } = authUser
    ? await supabase.from("profiles").select("role").eq("id", authUser.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to add contracts — contact a firm owner or partner." };
  }

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "contract",
    p_default_prefix: "CTR",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

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

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "contract",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title, party, contractType, valuePaise },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  await logAutoDocumentIssue(supabase, {
    entityType: "CONTRACT",
    entityId: inserted.id,
    projectId,
    ref: refData,
    issuedById: user?.id ?? null,
  });

  revalidatePath("/contracts");
  return null;
}
