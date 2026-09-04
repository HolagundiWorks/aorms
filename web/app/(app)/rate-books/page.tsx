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
import { NewRateBookForm } from "../../../components/aorms/NewRateBookForm";

export default async function RateBooksPage() {
  const supabase = await createClient();
  const { data: rateBooks, error } = await supabase
    .from("rate_books")
    .select("id, name, version_label, effective_date, locked")
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Rate Books</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Firm-level, versioned item-code/unit/rate sets that price project estimates.
        </p>

        <NewRateBookForm />

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
  );
}
