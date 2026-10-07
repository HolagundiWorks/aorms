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
import { PortalShell, type PortalSection } from "../../components/aorms/PortalShell";

/** Sections of an open project, in page order — anchors match the ids on the detail page. */
const PROJECT_SECTIONS: PortalSection[] = [
  { label: "Phases", anchor: "phases" },
  { label: "Tasks for you", anchor: "tasks" },
  { label: "Submit", anchor: "submit" },
  { label: "Your submissions", anchor: "submissions" },
  { label: "Drawings", anchor: "drawings" },
  { label: "Transmittals", anchor: "transmittals" },
];

/**
 * Collaborator Portal shell — `PortalShell` (the Office Hub's structure: firm header, user menu, icon rail with numbered
 * sheets, Instructions switch, corner figure, title block) scoped to a consultant: "Your engagements" and, inside a
 * project, that project's sections. Guards on `role === "CONSULTANT"`; any other signed-in role bounces to its own home.
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
    .select("role, full_name")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (profile?.role !== "CONSULTANT") redirect(roleHome(profile?.role) ?? "/login");

  // `firms` is staff-only under RLS; this security-definer function (migration 0096) returns just the caller's firm name.
  const { data: firmName } = await supabase.rpc("my_firm_name");
  const instructionsOn = (await cookies()).get(INSTRUCTIONS_COOKIE)?.value !== "off";

  return (
    <InstructionsScope>
      <IdleSessionGuard signOutAction={signOut} />
      <PortalShell
        portalLabel="AORMS Collaborator Portal"
        homeHref="/collab-portal"
        companyName={(firmName as string | null) ?? ""}
        userName={profile?.full_name?.trim() || "there"}
        userRole={ROLE_LABEL[profile?.role ?? ""] ?? "Consultant"}
        istHour={getIstHour()}
        projectSections={PROJECT_SECTIONS}
        homeLabel="Your engagements"
        sectionsTitle="This project"
        initialInstructions={instructionsOn}
      >
        {children}
      </PortalShell>
    </InstructionsScope>
  );
}
