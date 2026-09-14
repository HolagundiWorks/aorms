import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { getCurrentPlatformSessionAccount, isSuperAdmin } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { AccountAdminControls } from "../../../../components/aorms/platform/AccountAdminControls";
import { SendPasswordResetButton } from "../../../../components/aorms/platform/SendPasswordResetButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * SysDeX — Accounts, SUPER_ADMIN only (2026-09-10). Every AORMS-U-
 * personal account, platform-wide — the list a password reset needs
 * (there was previously no page showing individual accounts at all, only
 * membership rows joined through a Studio/Company).
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
  if (!isSuperAdmin(account)) return <AdminAccessDenied title="Accounts" />;

  const platformService = createPlatformServiceRoleClient();
  // admin_role now comes from platform_staff (2026-09-14, Identity/Admin
  // separation phase 1 — adminSetAccountRole only writes there now), not
  // accounts.admin_role directly — that column is legacy and no longer
  // kept in sync by writes, so reading it here would go stale the
  // moment anyone used the new control below. See lib/platform/
  // account.ts's resolveAdminRole for the same "platform_staff first"
  // resolution this list mirrors.
  const [{ data: accounts }, { data: staffRows }] = await Promise.all([
    platformService.from("accounts").select("id, public_id, full_name, level, created_at").order("created_at", { ascending: false }).limit(200),
    platformService.from("platform_staff").select("id, admin_role"),
  ]);
  const staffByAccountId = new Map((staffRows ?? []).map((s) => [s.id, s.admin_role as "SUPER_ADMIN" | "SUPPORT_STAFF"]));

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <PageHeader title="Accounts" description="Every AORMS-U- personal account on the Platform." />

          <Table aria-label="Accounts" className="aorms-table-spaced">
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
                  <TableCell colSpan={5}>No accounts yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
}
