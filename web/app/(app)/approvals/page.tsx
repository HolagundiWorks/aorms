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
import { NewApprovalForm } from "../../../components/aorms/NewApprovalForm";
import { ApprovalStatusSelect } from "../../../components/aorms/ApprovalStatusSelect";

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const [{ data: approvals, error }, { data: projects }] = await Promise.all([
    supabase
      .from("approvals")
      .select("id, entity_type, title, recipient, channel, status, sent_date, response_date, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Approvals</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          What was issued to a client or authority for sign-off, with channel and response status.
        </p>

        <NewApprovalForm projects={projects ?? []} />

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
  );
}
