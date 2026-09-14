import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { AccountAdminControls } from "../../../../components/aorms/platform/AccountAdminControls";
import { SendPasswordResetButton } from "../../../../components/aorms/platform/SendPasswordResetButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * SysDeX — Users, SUPER_ADMIN only (2026-09-10; restructured 2026-09-14).
 * Every person-level login on the AORMS Platform, under two clearly
 * headed sections rather than one undifferentiated list — a
 * portal-completion audit finding ("all the accounts need to be under
 * respective heading, users, companies, studios"): before this date this
 * page (and its "Accounts" nav label) implied it covered every account on
 * the platform, but it only ever queried `accounts` — a genuine Company
 * Account (`connectdex.company_accounts`, minted only via the ConnectDeX
 * admin-invite path, migration 0024) had no page anywhere in SysDeX at
 * all. Studios and Companies as *entities* (not the people who belong to
 * them) get their own directories too — see `/admin/studios` and
 * `/admin/companies`, both new the same pass.
 *
 * **Users** — every AORMS-U- Identity/Studio account (`accounts`), with
 * the existing level/admin-role overrides and password reset.
 * **Company Accounts** — every AORMS-CU- Company/ConnectDeX login
 * (`connectdex.company_accounts`), password reset only — these have
 * neither a BASIC/PRO level nor admin-role eligibility (both are
 * Identity-only concepts; see AORMS-PLATFORM-ARCHITECTURE.md's
 * Nomenclature table for the Account vs. Company Account distinction).
 *
 * `admin_role`/`level` direct overrides added 2026-09-14 (audit finding:
 * "user level basic pro scheme doesn't exist" / "activating user" — the
 * original migration 0016 decision to keep admin_role DB-only was
 * revised by explicit request; see AccountAdminControls.tsx and
 * lib/actions/platform.ts's adminSetAccountLevel/adminSetAccountRole for
 * the actual gating — both still require SUPER_ADMIN, now via app code +
 * RLS rather than "requires direct DB access" being the only path).
 */
export default async function AdminAccountsPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Users" />;

  const platformService = createPlatformServiceRoleClient();
  // admin_role now comes from platform_staff (2026-09-14, Identity/Admin
  // separation phase 1 — adminSetAccountRole only writes there now), not
  // accounts.admin_role directly — that column is legacy and no longer
  // kept in sync by writes, so reading it here would go stale the
  // moment anyone used the new control below. See lib/platform/
  // account.ts's resolveAdminRole for the same "platform_staff first"
  // resolution this list mirrors.
  const [{ data: accounts }, { data: staffRows }, { data: companyAccounts }] = await Promise.all([
    platformService.from("accounts").select("id, public_id, full_name, level, created_at").order("created_at", { ascending: false }).limit(200),
    platformService.from("platform_staff").select("id, admin_role"),
    platformService
      .schema("connectdex")
      .from("company_accounts")
      .select("id, public_id, full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const staffByAccountId = new Map((staffRows ?? []).map((s) => [s.id, s.admin_role as "SUPER_ADMIN" | "SUPPORT_STAFF"]));

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Users" description="Every person-level login on the AORMS Platform, by kind." />

          <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
            Users — AORMS Identity (AORMS-U-)
          </h2>
          <Table aria-label="Users" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Handle</TableHeader>
                <TableHeader>Level / Admin role</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(accounts ?? []).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.full_name || "—"}</TableCell>
                  <TableCell>{a.public_id}</TableCell>
                  <TableCell>
                    <AccountAdminControls
                      accountId={a.id}
                      level={a.level}
                      adminRole={staffByAccountId.get(a.id) ?? null}
                      isSelf={a.id === account?.id}
                    />
                  </TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <SendPasswordResetButton accountId={a.id} accountLabel={`${a.full_name || a.public_id} (${a.public_id})`} />
                  </TableCell>
                </TableRow>
              ))}
              {(accounts ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>No Identity accounts yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <h2 className="cds--type-heading-02" style={{ margin: "2rem 0 1rem" }}>
            Company Accounts — ConnectDeX (AORMS-CU-)
          </h2>
          <Table aria-label="Company Accounts" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Handle</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(companyAccounts ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.full_name || "—"}</TableCell>
                  <TableCell>{c.public_id}</TableCell>
                  <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <SendPasswordResetButton
                      accountId={c.id}
                      accountLabel={`${c.full_name || c.public_id} (${c.public_id})`}
                      accountKind="company"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(companyAccounts ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>No Company Accounts yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
}
