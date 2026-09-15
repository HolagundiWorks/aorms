import NextLink from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { adminActivateCompany } from "../../../../lib/actions/connectdex";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { ConnectDexActionButton } from "../../../../components/aorms/platform/company/ConnectDexActionButton";
import { SetCompanyTierForm } from "../../../../components/aorms/platform/company/SetCompanyTierForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";
import { portalUrl } from "../../../../lib/platform/subdomains";

const STATUS_TAG: Record<string, "gray" | "cyan" | "purple" | "green"> = {
  PENDING_ONBOARDING: "gray",
  PENDING_VERIFICATION: "cyan",
  PENDING_PAYMENT: "purple",
  ACTIVE: "green",
};

// Mirrors COMPANY_MEMBER_CAP (lib/actions/company.ts) — duplicated as a
// display-only constant rather than imported, since that file is
// "use server" (Server Actions only, no plain exported constants reach
// a Server Component import cleanly without its own module split); kept
// in sync by hand, same as this codebase's other admin-side display
// copies of a caps table (e.g. UpdateLicenceForm's own plan labels).
const COMPANY_MEMBER_CAP_DISPLAY: Record<string, number | null> = { BASE_LINE: 3, PRO: 10, PRO_PLUS: null };

/**
 * SysDeX — Companies, SUPER_ADMIN only (2026-09-14, portal-completion
 * audit finding: no platform-wide, browsable Company directory existed —
 * `/admin/connectdex` is shaped around the onboarding *review queue*
 * (pending applications/verification/payment, one section each), not a
 * general "every Company, any status" list — its own bottom "Active
 * companies" section only ever showed ACTIVE ones and had no link into
 * `/companies/[companyId]`. This page is that missing general directory;
 * `/admin/connectdex` is untouched and keeps doing what it does well
 * (the actionable review workflow).
 *
 * Member counts computed client-side from `company_memberships` (ACTIVE
 * only), same reasoning/precedent as `/admin/studios`.
 *
 * **Bug fix (2026-09-15, "portal sometimes jumps from SysDeX to
 * Identity")**: same cross-portal-link bug as `/admin/studios` — the
 * company-name link was a relative `href="/companies/${id}"`, which
 * `/companies` (Company-owned per `PORTAL_OWNED_PREFIXES`) redirects to
 * `connectdex.aorms.in` for, bouncing a SysDeX admin off `sysdex.aorms.in`.
 * `portalUrl("connectdex", ...)` builds the correct absolute URL.
 *
 * **Licence management (2026-09-15, "no proper licence management
 * system for companies... to activate, convert... assign users limits
 * as per plan")**: this general directory is now also where that
 * actually happens for *any* company regardless of status, not just the
 * ACTIVE-only fragment `/admin/connectdex` had — Tier is a live
 * `SetCompanyTierForm` (the "convert" ask), and a non-ACTIVE company
 * gets an "Activate" override (`adminActivateCompany`, same shape as
 * `/admin/connectdex`'s own "Awaiting payment" fix). Members now shows
 * "used / cap" against `COMPANY_MEMBER_CAP_DISPLAY` so the plan's real
 * user limit is visible here, not just enforced silently at join time.
 */
export default async function AdminCompaniesPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Companies" />;

  const platformService = createPlatformServiceRoleClient();
  const cx = platformService.schema("connectdex");
  const [{ data: companies }, { data: memberships }] = await Promise.all([
    cx.from("companies").select("id, name, public_id, city, state, status, tier, created_at").order("created_at", { ascending: false }),
    cx.from("company_memberships").select("company_id").eq("status", "ACTIVE"),
  ]);

  const memberCountByCompany = new Map<string, number>();
  for (const m of memberships ?? []) {
    memberCountByCompany.set(m.company_id, (memberCountByCompany.get(m.company_id) ?? 0) + 1);
  }

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader
            title="Companies"
            description="Every material/interior-supplier Company on the AORMS Platform, any onboarding status. For reviewing pending applications, see ConnectDeX instead."
          />

          <Table aria-label="Companies" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Handle</TableHeader>
                <TableHeader>Location</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Tier</TableHeader>
                <TableHeader>Members</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(companies ?? []).map((c) => {
                const memberCount = memberCountByCompany.get(c.id) ?? 0;
                const cap = COMPANY_MEMBER_CAP_DISPLAY[c.tier] ?? null;
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <NextLink href={portalUrl("connectdex", `/companies/${c.id}`)}>{c.name}</NextLink>
                    </TableCell>
                    <TableCell>{c.public_id}</TableCell>
                    <TableCell>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[c.status] ?? "gray"} size="sm">
                        {c.status}
                      </Tag>
                    </TableCell>
                    <TableCell>
                      <SetCompanyTierForm companyId={c.id} tier={c.tier} />
                    </TableCell>
                    <TableCell>
                      {memberCount} / {cap ?? "∞"}
                    </TableCell>
                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {c.status !== "ACTIVE" ? (
                        <ConnectDexActionButton
                          id={c.id}
                          label="Activate"
                          pendingLabel="Activating…"
                          kind="primary"
                          confirmMessage={`Activate ${c.name} without a captured payment? Use this only for a confirmed manual/complimentary arrangement.`}
                          action={adminActivateCompany}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(companies ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>No companies yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
}
