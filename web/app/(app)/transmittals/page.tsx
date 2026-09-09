import Link from "next/link";
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
import { AddTransmittalForm } from "../../../components/aorms/AddTransmittalForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { GeneratePdfButton } from "../../../components/aorms/GeneratePdfButton";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { generateTransmittalPdf } from "../../../lib/actions/transmittals";

export default async function TransmittalsPage() {
  const supabase = await createClient();

  const [{ data: transmittals, error }, { data: projects }] = await Promise.all([
    supabase
      .from("transmittals")
      .select("id, ref, recipient, purpose, channel, date_issued, acknowledged_at, pdf_status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = transmittals ?? [];
  const acknowledgedCount = rows.filter((t) => t.acknowledged_at).length;
  const pendingCount = rows.length - acknowledgedCount;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New transmittal" description="Track a drawing/document issue.">
        <AddTransmittalForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Transmittals"
              description="Drawing-issue tracking with client/consultant acknowledgment."
              actions={<ContextPanelTrigger size="sm">Add transmittal</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total transmittals" value={rows.length} />
              <KpiTile label="Acknowledged" value={acknowledgedCount} />
              <KpiTile label="Pending" value={pendingCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load transmittals: {error.message}
              </p>
            ) : (
              <Table aria-label="Transmittals" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Recipient</TableHeader>
                    <TableHeader>Purpose</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Channel</TableHeader>
                    <TableHeader>Acknowledged</TableHeader>
                    <TableHeader>PDF</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(transmittals ?? []).map((t) => {
                    const project = Array.isArray(t.project_offices)
                      ? t.project_offices[0]
                      : (t.project_offices as { title: string } | null);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Link href={`/transmittals/${t.id}`}>{t.ref}</Link>
                        </TableCell>
                        <TableCell>{t.recipient}</TableCell>
                        <TableCell>{t.purpose}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{t.channel}</TableCell>
                        <TableCell>
                          <Tag type={t.acknowledged_at ? "green" : "gray"} size="sm">
                            {t.acknowledged_at ? "Acknowledged" : "Pending"}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          <GeneratePdfButton
                            action={generateTransmittalPdf.bind(null, t.id)}
                            pdfStatus={t.pdf_status}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(transmittals ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No transmittals yet.
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
