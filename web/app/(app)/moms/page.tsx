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
import { AddMomForm } from "../../../components/aorms/AddMomForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function MomsPage() {
  const supabase = await createClient();

  const [{ data: moms, error }, { data: projects }] = await Promise.all([
    supabase
      .from("moms")
      .select("id, ref, title, meeting_date, venue, status, project_offices(title)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = moms ?? [];
  const draftCount = rows.filter((m) => m.status === "DRAFT").length;
  const issuedCount = rows.length - draftCount;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New minutes" description="Add meeting minutes for a project.">
        <AddMomForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Meeting Minutes"
              description="MOMs — minutes of meeting, per project."
              actions={<ContextPanelTrigger size="sm">Add minutes</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total minutes" value={rows.length} />
              <KpiTile label="Draft" value={draftCount} />
              <KpiTile label="Issued" value={issuedCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load minutes: {error.message}
              </p>
            ) : (
              <Table aria-label="Meeting Minutes" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Date</TableHeader>
                    <TableHeader>Venue</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(moms ?? []).map((m) => {
                    const project = Array.isArray(m.project_offices)
                      ? m.project_offices[0]
                      : (m.project_offices as { title: string } | null);
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Link href={`/moms/${m.id}`}>{m.ref}</Link>
                        </TableCell>
                        <TableCell>{m.title}</TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{m.meeting_date ?? "—"}</TableCell>
                        <TableCell>{m.venue ?? "—"}</TableCell>
                        <TableCell>
                          <Tag type={m.status === "DRAFT" ? "gray" : "green"} size="sm">
                            {m.status}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(moms ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No minutes yet.
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
