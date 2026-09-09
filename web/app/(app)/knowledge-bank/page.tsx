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
import { AddRepoSourceForm } from "../../../components/aorms/AddRepoSourceForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../components/aorms/PageHeader";

const STATUS_TAG: Record<string, "gray" | "blue" | "green" | "red" | "purple"> = {
  DRAFT: "gray",
  PROCESSING: "blue",
  REVIEW: "purple",
  PUBLISHED: "green",
  FAILED: "red",
};

export default async function KnowledgeBankPage() {
  const supabase = await createClient();

  const { data: sources, error } = await supabase
    .from("repo_sources")
    .select("id, title, author, category, status, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <ContextPanelLayout>
      <ContextPanel title="Add source" description="Add a knowledge bank reference source.">
        <AddRepoSourceForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Knowledge Bank Portal"
              description="Firm reference library — books, standards, and notes ESTI can draw on. The AI rephrase step (raw text → reviewable sections) isn't wired up yet, so new sources stay in Draft until that lands."
              actions={<ContextPanelTrigger size="sm">Add source</ContextPanelTrigger>}
            />

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load sources: {error.message}
              </p>
            ) : (
              <Table aria-label="Knowledge bank sources" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Author</TableHeader>
                    <TableHeader>Category</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(sources ?? []).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/knowledge-bank/${s.id}`}>{s.title}</Link>
                      </TableCell>
                      <TableCell>{s.author ?? "—"}</TableCell>
                      <TableCell>{s.category}</TableCell>
                      <TableCell>
                        <Tag type={STATUS_TAG[s.status] ?? "gray"} size="sm">
                          {s.status}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(sources ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No sources yet.
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
