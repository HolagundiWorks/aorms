import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "../../lib/supabase/server";
import { signOut } from "../../lib/actions/auth";
import { roleHome } from "../../lib/auth/role-home";
import { ROLE_LABEL } from "../../lib/auth/rank";
import { getIstHour } from "../../lib/shell/identity";
import { INSTRUCTIONS_COOKIE } from "../../lib/shell/preferences";
import { IdleSessionGuard } from "../../components/aorms/security/IdleSessionGuard";
import { InstructionsScope } from "../../components/aorms/InstructionsScope";
import { PortalShell, type PortalSection, type PortalSectionGroup } from "../../components/aorms/PortalShell";

/** Sections of an open tender / current project, in page order — anchors match the ids on the detail pages. */
const TENDER_SECTIONS: PortalSection[] = [
  { label: "Scope", anchor: "scope" },
  { label: "Instructions", anchor: "instructions" },
  { label: "Your bid", anchor: "bid" },
];
const PROJECT_SECTIONS: PortalSection[] = [
  { label: "Drawings", anchor: "drawings" },
  { label: "Change log", anchor: "changelog" },
  { label: "Progress schedule", anchor: "progress" },
  { label: "Running bills", anchor: "bills" },
  { label: "Cost tracking", anchor: "cost" },
  { label: "Tickets and meetings", anchor: "tickets" },
];
const SECTION_GROUPS: PortalSectionGroup[] = [
  { prefix: "/contractor-portal/projects", title: "This project", sections: PROJECT_SECTIONS },
  { prefix: "/contractor-portal", title: "This tender", sections: TENDER_SECTIONS },
];

/**
 * Contractor Portal shell — `PortalShell` (the Office Hub's structure: firm header, user menu, icon rail with numbered
 * sheets, Instructions switch, corner figure, title block) scoped to a contractor: "Your tenders" and, inside a tender,
 * its sections. Guards on `role === "CONTRACTOR"`; any other signed-in role bounces to its own home.
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

  // `firms` is staff-only under RLS; this security-definer function (migration 0096) returns just the caller's firm name.
  const { data: firmName } = await supabase.rpc("my_firm_name");
  const instructionsOn = (await cookies()).get(INSTRUCTIONS_COOKIE)?.value !== "off";

  return (
    <InstructionsScope>
      <IdleSessionGuard signOutAction={signOut} />
      <PortalShell
        portalLabel="AORMS Contractor Portal"
        homeHref="/contractor-portal"
        companyName={(firmName as string | null) ?? ""}
        userName={profile?.full_name?.trim() || "there"}
        userRole={ROLE_LABEL[profile?.role ?? ""] ?? "Contractor"}
        istHour={getIstHour()}
        projectSections={TENDER_SECTIONS}
        sectionGroups={SECTION_GROUPS}
        homeLabel="Projects and tenders"
        sectionsTitle="This tender"
        initialInstructions={instructionsOn}
      >
        {children}
      </PortalShell>
    </InstructionsScope>
  );
}
