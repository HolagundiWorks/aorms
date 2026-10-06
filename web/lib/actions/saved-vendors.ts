"use server";

/**
 * Saved vendors (roadmap P2, Studio↔Company): an account bookmarks supplier Companies
 * from the Material Catalogue. Inserts/deletes go through the service role scoped to the
 * session account's own id (`connectdex.saved_vendors` has no INSERT policy on purpose).
 */
import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "../platform/service";
import { getCurrentPlatformAccount, getCurrentPlatformSessionAccount } from "../platform/account";
import { toSafeErrorMessage } from "../security/safe-error";

export async function toggleSavedVendor(formData: FormData): Promise<void> {
  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return;
  const account = (await getCurrentPlatformSessionAccount()) ?? (await getCurrentPlatformAccount());
  if (!account) return;

  const service = createServiceRoleClient();
  const saved = service.schema("connectdex").from("saved_vendors");
  const { data: existing } = await saved.select("company_id").eq("account_id", account.id).eq("company_id", companyId).maybeSingle();
  if (existing) {
    const { error } = await saved.delete().eq("account_id", account.id).eq("company_id", companyId);
    if (error) throw new Error(toSafeErrorMessage(error));
  } else {
    const { data: company } = await service.schema("connectdex").from("companies").select("id").eq("id", companyId).maybeSingle();
    if (!company) return;
    const { error } = await saved.insert({ account_id: account.id, company_id: companyId });
    if (error) throw new Error(toSafeErrorMessage(error));
  }
  revalidatePath("/materials");
}
