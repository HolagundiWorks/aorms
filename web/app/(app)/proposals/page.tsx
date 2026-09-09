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
import { AddProposalForm } from "../../../components/aorms/AddProposalForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { generateProposalPdf } from "../../../lib/actions/proposals";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  SENT: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function ProposalsPage() {
  const supabase = await createClient();

  const [{ data: proposals, error }, { data: projects }] = await Promise.all([
    supabase
      .from("proposals")
      .select(
        "id, ref, status, work_category, work_type, fee_basis, fee_paise, client_approval_status, pdf_status, project_offices(title)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = proposals ?? [];
  const approvedCount = rows.filter((p) => p.status === "APPROVED").length;
  const sentCount = rows.filter((p) => p.status === "SENT").length;
  const totalFeePaise = rows.reduce((sum, p) => sum + (p.fee_paise ?? 0), 0);

  return (
    <ContextPanelLayout>
      <ContextPanel title="New proposal" description="Create a fee proposal or scope agreement.">
        <AddProposalForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Proposals"
              description="COA fee proposals and scope agreements."
              actions={<ContextPanelTrigger size="sm">Create proposal</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total proposals" value={rows.length} />
              <KpiTile label="Sent" value={sentCount} />
              <KpiTile label="Approved" value={approvedCount} />
              <KpiTile label="Fee value" value={formatInr(totalFeePaise)} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load proposals: {error.message}
              </p>
            ) : (
              <Table aria-label="Proposals" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Fee basis</TableHeader>
                    <TableHeader>Fee</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Client approval</TableHeader>
                    <TableHeader>PDF</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(proposals ?? []).map((p) => {
                    const project = Array.isArray(p.project_offices)
                      ? p.project_offices[0]
                      : (p.project_offices as { title: string } | null);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>{p.ref}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{p.work_category}</TableCell>
                        <TableCell>{p.fee_basis}</TableCell>
                        <TableCell>{formatInr(p.fee_paise)}</TableCell>
                        <TableCell>
                          <Tag type={STATUS_TAG[p.status] ?? "gray"} size="sm">
                            {p.status}
                          </Tag>
                        </TableCell>
                        <TableCell>{p.client_approval_status}</TableCell>
                        <TableCell>
                          <GeneratePdfButton action={generateProposalPdf.bind(null, p.id)} pdfStatus={p.pdf_status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(proposals ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No proposals yet.
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
