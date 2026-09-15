"use server";

import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import { roleHome } from "../auth/role-home";

export type StudioAccessActionState = { error: string } | null;

async function redirectToOwnHome(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<never> {
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const home = roleHome(profile?.role) ?? "/select-studio";
  return redirect(home);
}

/** Switch the caller's active firm to one they already belong to. */
export async function switchToFirm(_prev: StudioAccessActionState, formData: FormData): Promise<StudioAccessActionState> {
  const firmId = String(formData.get("firmId") ?? "");
  if (!firmId) return { error: "Choose a studio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  const { error } = await supabase.rpc("switch_active_firm", { p_firm_id: firmId });
  if (error) return { error: "Couldn't switch studios — please try again." };

  return redirectToOwnHome(supabase, user.id);
}

/**
 * Claim a Platform Studio that doesn't have a `profile_firm_memberships`
 * row for this profile yet — provisions a brand-new firm if the Studio
 * has never reached Office Hub before, or joins (as PENDING) the firm a
 * teammate already provisioned for it.
 */
export async function joinOrProvisionStudio(_prev: StudioAccessActionState, formData: FormData): Promise<StudioAccessActionState> {
  const publicId = String(formData.get("publicId") ?? "");
  const name = String(formData.get("name") ?? "");
  if (!publicId || !name) return { error: "Choose a studio." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired — please sign in again." };

  // Looking up whether a firm already exists for this Studio needs
  // service-role: RLS only lets a session read `firms` rows it's already
  // a member of (or its own active firm) — that's exactly the question
  // being answered here, so it can't be checked through the session client.
  const webService = createServiceRoleClient();
  const { data: existingFirm } = await webService.from("firms").select("id").eq("platform_studio_public_id", publicId).maybeSingle();

  const { error } = existingFirm
    ? await supabase.rpc("join_firm", { p_firm_id: existingFirm.id })
    : await supabase.rpc("provision_firm", { p_company_name: name, p_platform_studio_public_id: publicId });
  if (error) return { error: "Couldn't set up that studio — please try again." };

  return redirectToOwnHome(supabase, user.id);
}
