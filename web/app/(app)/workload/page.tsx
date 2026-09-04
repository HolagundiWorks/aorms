import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag, Tile } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

/**
 * Task counts by assignee — a slice of the current backend's workload
 * capacity view (day/month grids), not a full port. The calendar-feed
 * .ics subscription route (unauthenticated, token-based) isn't built
 * here either — it's a Route Handler outside the (app) auth group, per
 * the Phase 5 audit, tracked separately from this page.
 */
export default async function WorkloadPage() {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, status, priority, due_date, profiles!tasks_assignee_id_fkey(id, full_name)")
    .neq("status", "DONE");

  const rows = tasks ?? [];
  const byAssignee = new Map<string, { name: string; total: number; blocked: number; overdue: number }>();
  const today = new Date().toISOString().slice(0, 10);

  for (const t of rows) {
    const assignee = Array.isArray(t.profiles) ? t.profiles[0] : (t.profiles as { id: string; full_name: string | null } | null);
    const key = assignee?.id ?? "unassigned";
    const bucket = byAssignee.get(key) ?? { name: assignee?.full_name ?? "Unassigned", total: 0, blocked: 0, overdue: 0 };
    bucket.total += 1;
    if (t.status === "BLOCKED") bucket.blocked += 1;
    if (t.due_date && t.due_date < today) bucket.overdue += 1;
    byAssignee.set(key, bucket);
  }

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Workload</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Open task counts by assignee.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load tasks: {error.message}
          </p>
        ) : byAssignee.size === 0 ? (
          <Tile>
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No open tasks.
            </p>
          </Tile>
        ) : (
          <Table aria-label="Workload by assignee">
            <TableHead>
              <TableRow>
                <TableHeader>Assignee</TableHeader>
                <TableHeader>Open tasks</TableHeader>
                <TableHeader>Blocked</TableHeader>
                <TableHeader>Overdue</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from(byAssignee.values()).map((b) => (
                <TableRow key={b.name}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.total}</TableCell>
                  <TableCell>
                    {b.blocked > 0 ? (
                      <Tag type="red" size="sm">
                        {b.blocked}
                      </Tag>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                  <TableCell>
                    {b.overdue > 0 ? (
                      <Tag type="magenta" size="sm">
                        {b.overdue}
                      </Tag>
                    ) : (
                      "0"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
