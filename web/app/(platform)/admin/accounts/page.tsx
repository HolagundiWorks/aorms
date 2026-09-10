import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { getCurrentPlatformSessionAccount } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { SendPasswordResetButton } from "../../../../components/aorms/platform/SendPasswordResetButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * SysDeX — Accounts (2026-09-10). Every AORMS-U- personal account,
 * platform-wide — the list a password reset needs (there was previously
 * no page showing individual accounts at all, only membership rows joined
 * through a Studio/Company). `is_admin` itself stays DB-only here — no
 * grant/revoke toggle added (see platform/supabase/migrations/
 * 0009_admin_role.sql's own header comment) — that boundary is unchanged.
 */
export default async function AdminAccountsPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="Accounts" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: accounts } = await platformService
    .from("accounts")
    .select("id, public_id, full_name, level, is_admin, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

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
                <TableHeader>Level</TableHeader>
                <TableHeader>Admin</TableHeader>
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
                    <Tag type={a.level === "PRO" ? "green" : "cool-gray"} size="sm">
                      {a.level}
                    </Tag>
                  </TableCell>
                  <TableCell>{a.is_admin ? <Tag type="purple" size="sm">Admin</Tag> : "—"}</TableCell>
                  <TableCell>{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <SendPasswordResetButton accountId={a.id} accountLabel={`${a.full_name || a.public_id} (${a.public_id})`} />
                  </TableCell>
                </TableRow>
              ))}
              {(accounts ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>No accounts yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Column>
      </Grid>
    </>
  );
}
