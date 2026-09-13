import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { AppShell } from "../../components/aorms/AppShell";
import { roleHome } from "../../lib/auth/role-home";
import { UsageHeartbeat } from "../../components/aorms/platform/UsageHeartbeat";

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
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  const home = roleHome(profile?.role);
  // 2026-09-14: staff's own home is "/pulse" now (roleHome() — the
  // Pulse/Dashboard merge); "/dashboard" itself still resolves to a page
  // in this same (app) route group (a redirect to /pulse), so it isn't a
  // portal bounce case either.
  if (home && home !== "/pulse") redirect(home);

  return (
    <>
      <UsageHeartbeat />
      <AppShell>{children}</AppShell>
    </>
  );
}
