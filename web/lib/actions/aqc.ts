"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";

/** Staff release of an AQC version to the client portal (D10) — never done by sync. Needs `fees:manage` (enforced in the database function). */
export async function setVersionClientVisible(versionId: string, visible: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aqc_set_client_visible", { p_version: versionId, p_visible: visible });
  if (error) return { error: error.message.includes("not authorized") ? "You can't release estimates to clients." : toSafeErrorMessage(error) };
  revalidatePath("/aqc");
  return {};
}

/** Staff release of a bar schedule or schedule version to the contractors on the project. Needs `fees:manage` (database function). */
export async function setVersionContractorVisible(versionId: string, visible: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("aqc_set_contractor_visible", { p_version: versionId, p_visible: visible });
  if (error) return { error: error.message.includes("not authorized") ? "You can't release these to contractors." : toSafeErrorMessage(error) };
  revalidatePath("/aqc");
  return {};
}
