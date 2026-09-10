import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { getCurrentPlatformSessionAccount } from "../../../../lib/platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../../lib/platform/service";
import { AdminAccessDenied } from "../../../../components/aorms/platform/AdminAccessDenied";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { SysDexPortalHeader } from "../../../../components/aorms/platform/PortalHeaders";

/**
 * platform_activity_log viewer (platform/supabase/migrations/
 * 0012_activity_log.sql) — every row here was written by a database
 * trigger, not application code, so this is a record of what actually
 * happened, not of which Server Action remembered to log it. No filter UI
 * in this first pass (client-side filtering on `detail`'s free-form jsonb
 * doesn't paginate well; a real filter would want server-side query
 * params — left for a follow-up once real usage shows what filters matter
 * most).
 */
export default async function AdminLogsPage() {
  const account = await getCurrentPlatformSessionAccount();
  if (!account?.is_admin) return <AdminAccessDenied title="Activity Log" />;

  const platformService = createPlatformServiceRoleClient();
  const { data: log } = await platformService
    .from("platform_activity_log")
    .select("id, event_type, detail, created_at, accounts(public_id), studios(name, public_id), companies(name, public_id)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <SysDexPortalHeader />
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Activity Log" description="Every recorded platform event, most recent first — up to the last 200." />

        <Table aria-label="Activity log" className="aorms-table-spaced">
          <TableHead>
            <TableRow>
              <TableHeader>Event</TableHeader>
              <TableHeader>Account</TableHeader>
              <TableHeader>Studio / Company</TableHeader>
              <TableHeader>Detail</TableHeader>
              <TableHeader>Date</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(log ?? []).map((row) => {
              const acct = (Array.isArray(row.accounts) ? row.accounts[0] : row.accounts) as { public_id: string } | null;
              const studio = (Array.isArray(row.studios) ? row.studios[0] : row.studios) as { name: string; public_id: string } | null;
              const company = (Array.isArray(row.companies) ? row.companies[0] : row.companies) as { name: string; public_id: string } | null;
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.event_type}</TableCell>
                  <TableCell>{acct?.public_id ?? "—"}</TableCell>
                  <TableCell>
                    {studio ? `${studio.name} (${studio.public_id})` : company ? `${company.name} (${company.public_id})` : "—"}
                  </TableCell>
                  <TableCell>
                    <span className="cds--type-code-01">{JSON.stringify(row.detail)}</span>
                  </TableCell>
                  <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                </TableRow>
              );
            })}
            {(log ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No activity logged yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Column>
    </Grid>
    </>
  );
}
