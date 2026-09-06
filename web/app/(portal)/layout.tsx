import { redirect } from "next/navigation";
import NextLink from "next/link";
import { Content, Header, HeaderGlobalAction, HeaderGlobalBar, HeaderName } from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../../lib/actions/auth";
import { roleHome } from "../../lib/auth/role-home";

/**
 * Client Portal shell — a minimal Carbon `Header` + `Content`, deliberately
 * not `AppShell` (no SideNav — a client only ever sees their own projects,
 * a flat list needs no nested nav groups). Guards on `role === "CLIENT"`;
 * any other signed-in role bounces to its own home (staff -> `/dashboard`,
 * an as-yet-portal-less external role -> `/login`, defense in depth on top
 * of `(app)/layout.tsx`'s matching guard the other direction.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (profile?.role !== "CLIENT") redirect(roleHome(profile?.role) ?? "/login");

  return (
    <>
      <Header aria-label="AORMS Client Portal">
        <HeaderName as={NextLink} href="/portal" prefix="">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Plain <img>, not next/image — a fixed brand asset, not user content. */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "16px", width: "auto" }} />
            Client Portal
          </span>
        </HeaderName>
        <HeaderGlobalBar>
          <form action={signOut}>
            <HeaderGlobalAction aria-label="Sign out">
              <Logout size={20} />
            </HeaderGlobalAction>
          </form>
        </HeaderGlobalBar>
      </Header>
      <Content>{children}</Content>
    </>
  );
}
