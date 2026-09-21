import { CheckmarkFilled, CheckmarkOutline, Time } from "@carbon/icons-react";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddApprovalForm } from "../../../components/aorms/AddApprovalForm";
import { ApprovalStatusSelect } from "../../../components/aorms/ApprovalStatusSelect";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's "approvals:
// staff write" policy). Gates the "Log approval" trigger the same way
// Clients/Contractors/Projects already gate their own create triggers —
// found missing here by a 2026-09-21 sweep of every /app/(app)/*/page.tsx
// with an unguarded ContextPanelTrigger after the same class of bug was
// confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: approvals, error }, { data: projects }, { data: myProfile }] = await Promise.all([
    supabase
      .from("approvals")
      .select("id, entity_type, title, recipient, channel, status, sent_date, response_date, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = approvals ?? [];
  const pendingCount = rows.filter((a) => a.status === "SENT").length;
  const approvedCount = rows.filter((a) => a.status === "APPROVED").length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New approval" description="Log something sent for client/authority sign-off.">
          <AddApprovalForm projects={projects ?? []} />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Approvals"
              description="What was issued to a client or authority for sign-off, with channel and response status."
              actions={canWrite ? <ContextPanelTrigger size="sm">Log approval</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total approvals" value={rows.length} icon={CheckmarkOutline} />
              <KpiTile label="Pending" value={pendingCount} icon={Time} />
              <KpiTile label="Approved" value={approvedCount} icon={CheckmarkFilled} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load approvals: {error.message}
              </p>
            ) : (
              <Table aria-label="Approvals" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Recipient</TableHeader>
                    <TableHeader>Channel</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(approvals ?? []).map((a) => {
                    const project = Array.isArray(a.project_offices)
                      ? a.project_offices[0]
                      : (a.project_offices as { title: string } | null);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{a.title}</TableCell>
                        <TableCell>
                          <Tag type="gray" size="sm">
                            {a.entity_type}
                          </Tag>
                        </TableCell>
                        <TableCell>{a.recipient ?? "—"}</TableCell>
                        <TableCell>{a.channel}</TableCell>
                        <TableCell>
                          <ApprovalStatusSelect approvalId={a.id} status={a.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(approvals ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No approvals logged yet.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
