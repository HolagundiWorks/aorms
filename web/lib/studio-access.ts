import { createClient } from "./supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "./platform/service";

export type AccessibleFirm = { firmId: string; name: string; role: string };
export type JoinableStudio = { publicId: string; name: string };

/**
 * Data for the studio picker (`/select-studio`) — every firm this profile
 * already belongs to (`profile_firm_memberships`, migration 0055), plus
 * every Platform Studio their linked Identity account is an active member
 * of that doesn't have a membership yet (i.e. still needs `provision_firm`/
 * `join_firm`). A profile with no Platform link at all just gets `firms`
 * back with `joinable` empty.
 */
export async function getStudioAccessOptions(): Promise<{
  firms: AccessibleFirm[];
  joinable: JoinableStudio[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { firms: [], joinable: [] };

  const [{ data: memberships }, { data: profile }] = await Promise.all([
    supabase
      .from("profile_firm_memberships")
      .select("firm_id, role, firms(company_name, platform_studio_public_id)")
      .eq("profile_id", user.id),
    supabase.from("profiles").select("platform_public_id").eq("id", user.id).maybeSingle(),
  ]);

  type MembershipRow = { firm_id: string; role: string; firms: { company_name: string; platform_studio_public_id: string | null } | null };
  const rows = (memberships ?? []) as unknown as MembershipRow[];

  const firms: AccessibleFirm[] = rows.map((m) => ({
    firmId: m.firm_id,
    name: m.firms?.company_name || "Untitled firm",
    role: m.role,
  }));
  const linkedStudioPublicIds = new Set(rows.map((m) => m.firms?.platform_studio_public_id).filter((id): id is string => !!id));

  let joinable: JoinableStudio[] = [];
  if (profile?.platform_public_id) {
    const platformService = createPlatformServiceRoleClient();
    const { data: account } = await platformService
      .from("accounts")
      .select("id")
      .eq("public_id", profile.platform_public_id)
      .maybeSingle();

    if (account) {
      const { data: studioMemberships } = await platformService
        .from("studio_memberships")
        .select("studios(id, name, public_id)")
        .eq("account_id", account.id)
        .eq("status", "ACTIVE");

      type StudioRow = { studios: { id: string; name: string; public_id: string } | null };
      joinable = ((studioMemberships ?? []) as unknown as StudioRow[])
        .map((m) => m.studios)
        .filter((s): s is { id: string; name: string; public_id: string } => !!s && !linkedStudioPublicIds.has(s.public_id))
        .map((s) => ({ publicId: s.public_id, name: s.name }));
    }
  }

  return { firms, joinable };
}
