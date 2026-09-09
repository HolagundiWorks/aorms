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
import { AddTenderForm } from "../../../components/aorms/AddTenderForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

const STATUS_TAG: Record<string, "gray" | "blue" | "purple" | "green" | "red"> = {
  DRAFT: "gray",
  OPEN: "blue",
  CLOSED: "purple",
  AWARDED: "green",
  CANCELLED: "red",
};

export default async function TendersPage() {
  const supabase = await createClient();

  const [{ data: tenders, error }, { data: projects }] = await Promise.all([
    supabase
      .from("tenders")
      .select("id, title, category, status, due_date, project_offices(title), contractors(name)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
  ]);

  const rows = tenders ?? [];
  const openCount = rows.filter((t) => t.status === "OPEN").length;
  const awardedCount = rows.filter((t) => t.status === "AWARDED").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New tender" description="Issue a project tender.">
        <AddTenderForm projects={projects ?? []} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Tenders"
              description="Firm-issued project tenders — distinct from the AProc work-package tendering module, ported as the two separate systems they are today."
              actions={<ContextPanelTrigger size="sm">Issue tender</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total tenders" value={rows.length} />
              <KpiTile label="Open" value={openCount} />
              <KpiTile label="Awarded" value={awardedCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load tenders: {error.message}
              </p>
            ) : (
              <Table aria-label="Tenders" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Project</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Awarded to</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(tenders ?? []).map((t) => {
                    const project = Array.isArray(t.project_offices) ? t.project_offices[0] : (t.project_offices as { title: string } | null);
                    const contractor = Array.isArray(t.contractors) ? t.contractors[0] : (t.contractors as { name: string } | null);
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <Link href={`/tenders/${t.id}`}>{t.title}</Link>
                        </TableCell>
                        <TableCell>{project?.title ?? "—"}</TableCell>
                        <TableCell>{t.category ?? "—"}</TableCell>
                        <TableCell>{contractor?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Tag type={STATUS_TAG[t.status] ?? "gray"} size="sm">
                            {t.status}
                          </Tag>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(tenders ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No tenders yet.
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
