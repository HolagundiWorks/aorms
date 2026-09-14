import NextLink from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

const STATUS_TAG: Record<string, "gray" | "cyan" | "purple" | "green"> = {
  PENDING_ONBOARDING: "gray",
  PENDING_VERIFICATION: "cyan",
  PENDING_PAYMENT: "purple",
  ACTIVE: "green",
};

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
              </TableRow>
            </TableHead>
            <TableBody>
              {(companies ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <NextLink href={`/companies/${c.id}`}>{c.name}</NextLink>
                  </TableCell>
                  <TableCell>{c.public_id}</TableCell>
                  <TableCell>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Tag type={STATUS_TAG[c.status] ?? "gray"} size="sm">
                      {c.status}
                    </Tag>
                  </TableCell>
                  <TableCell>{c.tier}</TableCell>
                  <TableCell>{memberCountByCompany.get(c.id) ?? 0}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
              {(companies ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>No companies yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
}
