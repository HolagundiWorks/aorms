import { redirect } from "next/navigation";
import { Content, Header, HeaderGlobalAction, HeaderGlobalBar } from "@carbon/react";
import { Logout } from "@carbon/icons-react";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../../lib/actions/auth";
import { roleHome } from "../../lib/auth/role-home";
import { PortalHeaderName } from "../../components/aorms/PortalHeaderName";
import { IdleSessionGuard } from "../../components/aorms/security/IdleSessionGuard";
import { InstructionsScope } from "../../components/aorms/InstructionsScope";
import { InstructionsToggle } from "../../components/aorms/InstructionsToggle";
import { TitleBlock } from "../../components/aorms/TitleBlock";
import { SheetNameplate } from "../../components/aorms/SheetNameplate";
import { BrandWatermark } from "../../components/aorms/BrandWatermark";

/**
 * Contractor Portal shell — same minimal Carbon `Header` + `Content`
 * pattern as `(portal)/layout.tsx` (the Client Portal), guarding
 * `role === "CONTRACTOR"` instead.
 */
export default async function ContractorPortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (profile?.role !== "CONTRACTOR") redirect(roleHome(profile?.role) ?? "/login");

  return (
    <InstructionsScope>
      <IdleSessionGuard signOutAction={signOut} />
      <Header aria-label="AORMS Contractor Portal">
        <PortalHeaderName href="/contractor-portal" label="Contractor Portal" />
        <HeaderGlobalBar>
          <InstructionsToggle />
          <form action={signOut}>
            <HeaderGlobalAction aria-label="Sign out">
              <Logout size={20} />
            </HeaderGlobalAction>
          </form>
        </HeaderGlobalBar>
      </Header>
      <Content className="aorms-has-np">{children}</Content>
      <SheetNameplate who={{ name: profile?.full_name?.trim() || "Contractor", role: "Contractor" }} />
      {/* Same sheet footer + AORMS mark as the Office Hub (2026-10-01 portal parity). */}
      <TitleBlock companyName="" />
      <BrandWatermark />
    </InstructionsScope>
  );
}
