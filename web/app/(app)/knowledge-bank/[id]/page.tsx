import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { RepoSourceActions } from "../../../../components/aorms/RepoSourceActions";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "purple"> = {
  DRAFT: "gray",
  PROCESSING: "blue",
  REVIEW: "purple",
  PUBLISHED: "green",
  FAILED: "red",
};

export default async function KnowledgeBankSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: source, error: sourceError }, { data: sections, error: sectionsError }] = await Promise.all([
    supabase
      .from("repo_sources")
      .select("id, title, author, category, status, markdown_text, executive_summary, process_error")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("repo_sections").select("id, title, summary, rephrased").eq("source_id", id).order("seq"),
  ]);

  if (sourceError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load source: {sourceError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!source) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {source.category}
          {source.author ? ` · ${source.author}` : ""}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <h1 className="cds--type-heading-05">{source.title}</h1>
          <Tag type={STATUS_TAG[source.status] ?? "gray"} size="sm">
            {source.status}
          </Tag>
        </div>

        <RepoSourceActions sourceId={source.id} status={source.status} />

        {source.process_error && (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)", marginBottom: "1.5rem" }}>
            Processing error: {source.process_error}
          </p>
        )}

        {source.executive_summary && (
          <>
            <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
              Executive summary
            </h2>
            <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
              {source.executive_summary}
            </p>
          </>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
          Sections
        </h2>
        {sectionsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load sections: {sectionsError.message}
          </p>
        ) : (sections ?? []).length === 0 ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1.5rem" }}>
            No reviewable sections yet — these come from the AI rephrase step, not built here.
          </p>
        ) : (
          <div style={{ marginBottom: "1.5rem" }}>
            <Table aria-label="Sections" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Title</TableHeader>
                  <TableHeader>Summary</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {(sections ?? []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.title}</TableCell>
                    <TableCell>{s.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "0.5rem" }}>
          Source text
        </h2>
        <p
          className="cds--type-body-01"
          style={{ whiteSpace: "pre-wrap", padding: "1rem", background: "var(--cds-layer-01)" }}
        >
          {source.markdown_text}
        </p>
      </Column>
    </Grid>
  );
}
