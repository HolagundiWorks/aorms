import { redirect } from "next/navigation";
import NextLink from "next/link";
import { Content, Header, HeaderGlobalAction, HeaderGlobalBar, HeaderName } from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../../lib/actions/auth";
import { roleHome } from "../../lib/auth/role-home";

/**
 * Collaborator Portal shell — same minimal Carbon `Header` + `Content`
 * pattern as `(portal)/layout.tsx` (the Client Portal), guarding
 * `role === "CONSULTANT"` instead. See that file's comment for why this
 * isn't `AppShell` (a consultant only ever sees their own engaged projects,
 * no nested nav groups needed).
 */
export default async function CollabPortalLayout({ children }: { children: React.ReactNode }) {
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

  if (profile?.role !== "CONSULTANT") redirect(roleHome(profile?.role) ?? "/login");

  return (
    <>
      <Header aria-label="AORMS Collaborator Portal">
        <HeaderName as={NextLink} href="/collab-portal" prefix="">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Plain <img>, not next/image — a fixed brand asset, not user content. */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "16px", width: "auto" }} />
            Collaborator Portal
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
