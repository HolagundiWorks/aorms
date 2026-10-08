"use server";

/**
 * Contract variations and bill payments (2026-10-08). A variation is a signed amount against a package (additions
 * positive, omissions negative); only APPROVED ones change the contractor-visible revised contract value, and
 * approving needs `cost:approve`. A payment records what the studio/client actually paid against an RA bill so the
 * contractor's cost tracking can show received vs outstanding.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

export type FinanceActionState = { error: string } | { ok: string } | null;

const rupeesToPaise = (raw: string) => Math.round(Number(raw.replaceAll(",", "")) * 100);

export async function createVariation(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const packageId = String(formData.get("packageId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const paise = rupeesToPaise(String(formData.get("amount") ?? ""));
  if (!packageId) return { error: "Missing package." };
  if (!title || title.length > 200) return { error: "Add a title (200 characters max)." };
  if (!Number.isFinite(paise) || paise === 0) return { error: "Enter the variation amount in rupees (negative for an omission)." };

  const supabase = await createClient();
  const { data: pkg } = await supabase.from("pmc_packages").select("project_id").eq("id", packageId).maybeSingle();
  if (!pkg) return { error: "Package not found." };
  const { data: ref, error: refErr } = await supabase.rpc("next_ref", { p_scope: "pmc_variation", p_default_prefix: "VO" });
  if (refErr) return { error: toSafeErrorMessage(refErr) };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("pmc_variations").insert({ project_id: pkg.project_id, package_id: packageId, ref, title, note: note || null, amount_paise: paise, created_by_id: user?.id ?? null });
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath(`/pmc-packages/${packageId}`);
  return { ok: "Variation added as a draft." };
}

export async function setVariationStatus(id: string, packageId: string, status: string): Promise<{ error?: string }> {
  if (!["DRAFT", "APPROVED", "REJECTED"].includes(status)) return { error: "Invalid status." };
  const supabase = await createClient();
  if (status === "APPROVED") {
    const { data: ok } = await supabase.rpc("has_capability", { cap: "cost:approve" });
    if (!ok) return { error: "Approving a variation needs cost approval rights." };
  }
  const { error } = await supabase
    .from("pmc_variations")
    .update({ status, approved_at: status === "APPROVED" ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: toSafeErrorMessage(error) };
  revalidatePath(`/pmc-packages/${packageId}`);
  return {};
}

export async function recordBillPayment(_prev: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  const billId = String(formData.get("billId") ?? "").trim();
  const paidAt = String(formData.get("paidAt") ?? "").trim();
  const paise = rupeesToPaise(String(formData.get("amount") ?? ""));
  if (!billId) return { error: "Missing bill." };
  if (!Number.isFinite(paise) || paise < 0) return { error: "Enter the amount received in rupees." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidAt)) return { error: "Enter the payment date." };

  const supabase = await createClient();
  const { error } = await supabase.from("pmc_ra_bills").update({ paid_paise: paise, paid_at: paidAt, updated_at: new Date().toISOString() }).eq("id", billId);
  if (error) return { error: toSafeErrorMessage(error) };
  await supabase.rpc("write_audit", { p_entity: "pmc_ra_bill", p_entity_id: billId, p_action: "UPDATE", p_before: null, p_after: { paid_paise: paise, paid_at: paidAt } });
  revalidatePath(`/pmc-ra-bills/${billId}`);
  return { ok: "Payment recorded." };
}
