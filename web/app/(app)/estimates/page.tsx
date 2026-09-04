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
import { NewEstimateForm } from "../../../components/aorms/NewEstimateForm";

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

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Estimates</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Priced BOQ against a rate book, with contingency + GST rollup.
        </p>

        <NewEstimateForm projects={projects ?? []} rateBooks={rateBooks ?? []} />

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
  );
}
