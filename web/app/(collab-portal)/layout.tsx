import { redirect } from "next/navigation";
import { Content, Header, HeaderGlobalBar } from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../../lib/actions/auth";
import { roleHome } from "../../lib/auth/role-home";
import { PortalHeaderName } from "../../components/aorms/PortalHeaderName";
import { IdleSessionGuard } from "../../components/aorms/security/IdleSessionGuard";
import { InstructionsScope } from "../../components/aorms/InstructionsScope";
import { InstructionsToggle } from "../../components/aorms/InstructionsToggle";
import { TitleBlock } from "../../components/aorms/TitleBlock";
import { BrandWatermark } from "../../components/aorms/BrandWatermark";

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
    <InstructionsScope>
      <IdleSessionGuard signOutAction={signOut} />
      <Header aria-label="AORMS Collaborator Portal">
        <PortalHeaderName href="/collab-portal" label="Collaborator Portal" />
        <HeaderGlobalBar>
          <InstructionsToggle />
          <form action={signOut}>
            {/* A real submit button: Carbon's HeaderGlobalAction renders type="button", so inside a <form> it never submitted (sign-out did nothing, 2026-10-06). */}
            <button type="submit" className="cds--header__action" aria-label="Sign out" title="Sign out">
              <Logout size={20} />
            </button>
          </form>
        </HeaderGlobalBar>
      </Header>
      <Content>{children}</Content>
      {/* Same sheet footer + AORMS mark as the Office Hub (2026-10-01 portal parity). */}
      <TitleBlock companyName="" />
      <BrandWatermark />
    </InstructionsScope>
  );
}
