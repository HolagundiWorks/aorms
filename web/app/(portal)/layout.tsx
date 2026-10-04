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
    .select("role, full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (profile?.role !== "CLIENT") redirect(roleHome(profile?.role) ?? "/login");

  return (
    <InstructionsScope>
      <IdleSessionGuard signOutAction={signOut} />
      <Header aria-label="AORMS Client Portal">
        <PortalHeaderName href="/portal" label="Client Portal" />
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
      <SheetNameplate who={{ name: profile?.full_name?.trim() || "Client", role: "Client" }} />
      {/* Same sheet footer + AORMS mark as the Office Hub (2026-10-01 portal parity). */}
      <TitleBlock companyName="" />
      <BrandWatermark />
    </InstructionsScope>
  );
}
