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
import { AddEstimateForm } from "../../../components/aorms/AddEstimateForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red"> = {
  DRAFT: "gray",
  FINALISED: "blue",
  APPROVED: "green",
  CANCELLED: "red",
};

export default async function EstimatesPage() {
  const supabase = await createClient();

  const [{ data: estimates, error }, { data: projects }, { data: rateBooks }] = await Promise.all([
    supabase
      .from("estimates")
      .select("id, ref, title, status, contingency_pct, gst_pct, project_offices(title), rate_books(name)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase.from("rate_books").select("id, name").order("name"),
  ]);

  const rows = estimates ?? [];
  const approvedCount = rows.filter((e) => e.status === "APPROVED").length;
  const draftCount = rows.filter((e) => e.status === "DRAFT").length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New estimate" description="Price a project's BOQ against a rate book.">
        <AddEstimateForm projects={projects ?? []} rateBooks={rateBooks ?? []} />
      </ContextPanel>
      <ContextPanelContent>
      <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          title="Estimates"
          description="Priced BOQ against a rate book, with contingency + GST rollup."
          actions={<ContextPanelTrigger size="sm">New estimate</ContextPanelTrigger>}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          <KpiTile label="Total estimates" value={rows.length} />
          <KpiTile label="Draft" value={draftCount} />
          <KpiTile label="Approved" value={approvedCount} />
        </div>

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load estimates: {error.message}
          </p>
        ) : (
          <Table aria-label="Estimates" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Rate book</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(estimates ?? []).map((e) => {
                const project = Array.isArray(e.project_offices)
                  ? e.project_offices[0]
                  : (e.project_offices as { title: string } | null);
                const rateBook = Array.isArray(e.rate_books)
                  ? e.rate_books[0]
                  : (e.rate_books as { name: string } | null);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/estimates/${e.id}`}>{e.ref}</Link>
                    </TableCell>
                    <TableCell>{e.title}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{rateBook?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Tag type={STATUS_TAG[e.status] ?? "gray"} size="sm">
                        {e.status}
                      </Tag>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(estimates ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No estimates yet.
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
