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

/** Sections of an open project, in page order — anchors match the ids on `portal/[projectId]/page.tsx`. */
const PROJECT_SECTIONS: PortalSection[] = [
  { label: "Phases", anchor: "phases" },
  { label: "Approvals", anchor: "approvals" },
  { label: "Decisions", anchor: "decisions" },
  { label: "Invoices", anchor: "invoices" },
  { label: "Drawings", anchor: "drawings" },
  { label: "Transmittals", anchor: "transmittals" },
  { label: "Estimate", anchor: "estimate" },
  { label: "Meeting minutes", anchor: "minutes" },
  { label: "Get in touch", anchor: "contact" },
];

/**
 * Client Portal shell — the Office Hub's structure (header with the firm's name and user menu, icon rail with
 * numbered sheets, Instructions switch, corner figure, title block) in `PortalShell`, scoped to a client: it lists
 * "Your projects" and, inside a project, that project's sections. Guards on `role === "CLIENT"`; any other
 * signed-in role bounces to its own home (staff -> `/dashboard`, an as-yet-portal-less external role -> `/login`,
 * defense in depth on top of `(app)/layout.tsx`'s matching guard the other direction.
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

  // `firms` is staff-only under RLS; this security-definer function (migration 0096) returns just the caller's firm name.
  const { data: firmName } = await supabase.rpc("my_firm_name");
  const instructionsOn = (await cookies()).get(INSTRUCTIONS_COOKIE)?.value !== "off";

  return (
    <InstructionsScope>
      <IdleSessionGuard signOutAction={signOut} />
      <PortalShell
        portalLabel="AORMS Client Portal"
        homeHref="/portal"
        companyName={(firmName as string | null) ?? ""}
        userName={profile?.full_name?.trim() || "there"}
        userRole={ROLE_LABEL[profile?.role ?? ""] ?? "Client"}
        istHour={getIstHour()}
        projectSections={PROJECT_SECTIONS}
        initialInstructions={instructionsOn}
      >
        {children}
      </PortalShell>
    </InstructionsScope>
  );
}
