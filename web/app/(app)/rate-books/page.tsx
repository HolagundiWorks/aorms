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
import { AddRateBookForm } from "../../../components/aorms/AddRateBookForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function RateBooksPage() {
  const supabase = await createClient();
  const { data: rateBooks, error } = await supabase
    .from("rate_books")
    .select("id, name, version_label, effective_date, locked")
    .order("created_at", { ascending: false });

  const rows = rateBooks ?? [];
  const openCount = rows.filter((rb) => !rb.locked).length;

  return (
    <ContextPanelLayout>
      <ContextPanel title="New rate book" description="Start a new versioned rate book.">
        <AddRateBookForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Rate Books"
              description="Firm-level, versioned item-code/unit/rate sets that price project estimates."
              actions={<ContextPanelTrigger size="sm">New rate book</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total rate books" value={rows.length} />
              <KpiTile label="Open" value={openCount} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load rate books: {error.message}
              </p>
            ) : (
              <Table aria-label="Rate Books" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Version</TableHeader>
                    <TableHeader>Effective date</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(rateBooks ?? []).map((rb) => (
                    <TableRow key={rb.id}>
                      <TableCell>
                        <Link href={`/rate-books/${rb.id}`}>{rb.name}</Link>
                      </TableCell>
                      <TableCell>{rb.version_label ?? "—"}</TableCell>
                      <TableCell>{rb.effective_date ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={rb.locked ? "gray" : "green"} size="sm">
                          {rb.locked ? "Locked" : "Open"}
                        </Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(rateBooks ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No rate books yet.
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
