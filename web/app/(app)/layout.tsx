import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { AppShell } from "../../components/aorms/AppShell";
import { roleHome } from "../../lib/auth/role-home";
import { ROLE_LABEL } from "../../lib/auth/rank";
import { getIstHour } from "../../lib/shell/identity";
import { UsageHeartbeat } from "../../components/aorms/platform/UsageHeartbeat";
import { IdleSessionGuard } from "../../components/aorms/security/IdleSessionGuard";
import { signOut } from "../../lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  // Defense in depth: a CLIENT/CONSULTANT/CONTRACTOR profile hitting a
  // staff URL directly (bookmark, stale link) bounces to their own portal
  // instead of landing on a staff shell RLS would mostly show empty anyway.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // full_name/role feed the header's identity block (2026-09-14,
  // shell/identity/KPI spec §5) — firm.company_name alongside it for the
  // organisation block; the project list feeds the floating Ask Pulse
  // button's own "for a project's own records" selector
  // (FloatingAskPulse.tsx / AskPulseForm.tsx). All fetched here (once,
  // Server Component) and passed down to AppShell.tsx (a Client
  // Component, can't fetch its own Supabase data) rather than each page
  // re-fetching its own copy.
  const [{ data: profile }, { data: firm }, { data: projects }, { count: membershipCount }] = await Promise.all([
    supabase.from("profiles").select("full_name, role, platform_public_id").eq("id", user?.id ?? "").maybeSingle(),
    supabase.from("firms").select("company_name").maybeSingle(),
    supabase.from("project_offices").select("id, title").order("title"),
    // Multi-tenancy (migration 0055) — a profile belonging to more than one
    // firm gets a "Switch studio" entry in the user menu (HeaderUserMenu.tsx).
    supabase.from("profile_firm_memberships").select("id", { count: "exact", head: true }).eq("profile_id", user?.id ?? ""),
  ]);
  // Also show the entry for a single-membership, Identity-linked profile —
  // found live (2026-09-19): a profile whose Platform account owns a
  // second Studio it hasn't set up in Office Hub yet has only ONE
  // profile_firm_memberships row so far, but still needs a way back to
  // /select-studio's "available to set up" list — there was previously no
  // route there at all short of re-typing the URL. Cheap to check (a
  // column already fetched above); the actual Platform lookup for what's
  // joinable only happens if they follow the link, not on every page load.
  const hasMultipleStudios = (membershipCount ?? 0) > 1 || !!profile?.platform_public_id;
  const home = roleHome(profile?.role);
  // 2026-09-14: staff's own home is "/pulse" now (roleHome() — the
  // Pulse/Dashboard merge); "/dashboard" itself still resolves to a page
  // in this same (app) route group (a redirect to /pulse), so it isn't a
  // portal bounce case either.
  if (home && home !== "/pulse") redirect(home);

  return (
    <>
      <UsageHeartbeat />
      <IdleSessionGuard signOutAction={signOut} />
      <AppShell
        companyName={firm?.company_name ?? ""}
        userName={profile?.full_name?.trim() || "there"}
        userRole={ROLE_LABEL[profile?.role ?? ""] ?? "Staff"}
        istHour={getIstHour()}
        projects={projects ?? []}
        hasMultipleStudios={hasMultipleStudios}
      >
        {children}
      </AppShell>
    </>
  );
}
