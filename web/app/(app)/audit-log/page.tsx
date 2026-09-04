import {
  Column,
  Grid,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";

/**
 * Page-level OWNER-only gate — the current backend's audit.list procedure is
 * ownerProcedure (rank 100), stricter than audit_log's own table RLS
 * ("audit_log: staff read", is_office_staff(), from Phase 2). Per the
 * Phase 5 audit's recommendation: keep RLS broad (defense-in-depth, a
 * deliberate Phase 2 choice) and add the owner-only restriction here at
 * the page level, matching the current viewer's actual behaviour rather
 * than silently tightening or loosening either layer.
 */
export default async function AuditLogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (profile?.role !== "OWNER") {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <h1 className="cds--type-heading-05">Audit Log</h1>
          <InlineNotification
            kind="error"
            title="Owner access required"
            subtitle="The audit log viewer is restricted to the firm owner."
            hideCloseButton
            lowContrast
          />
        </Column>
      </Grid>
    );
  }

  const { data: entries, error } = await supabase
    .from("audit_log")
    .select("id, entity, entity_id, action, before, after, created_at, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Audit Log</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Most recent 100 mutations, newest first.
        </p>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load the audit log: {error.message}
          </p>
        ) : (
          <Table aria-label="Audit log">
            <TableHead>
              <TableRow>
                <TableHeader>When</TableHeader>
                <TableHeader>Actor</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Entity</TableHeader>
                <TableHeader>Entity ID</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(entries ?? []).map((e) => {
                const actor = Array.isArray(e.profiles)
                  ? e.profiles[0]
                  : (e.profiles as { full_name: string | null } | null);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.created_at).toLocaleString("en-IN")}</TableCell>
                    <TableCell>{actor?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={e.action === "CREATE" ? "green" : e.action === "DELETE" ? "red" : "blue"} size="sm">
                        {e.action}
                      </Tag>
                    </TableCell>
                    <TableCell>{e.entity}</TableCell>
                    <TableCell>
                      <code style={{ fontSize: "0.75rem" }}>{e.entity_id?.slice(0, 8) ?? "—"}</code>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(entries ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No audit entries yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
