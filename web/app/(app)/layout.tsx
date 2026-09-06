import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import { AppShell } from "../../components/aorms/AppShell";
import { roleHome } from "../../lib/auth/role-home";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  // Defense in depth: a CLIENT-role profile hitting a staff URL directly
  // (bookmark, stale link) bounces to their own portal instead of landing
  // on a staff shell RLS would mostly show empty anyway.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (roleHome(profile?.role) === "/portal") redirect("/portal");

  return <AppShell>{children}</AppShell>;
}
