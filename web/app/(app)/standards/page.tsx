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
import { NewStandardForm } from "../../../components/aorms/NewStandardForm";

export default async function StandardsPage() {
  const supabase = await createClient();

  const { data: standards, error } = await supabase
    .from("standards")
    .select("id, discipline, title, notes, created_at")
    .order("created_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Standards Library</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Design standards by discipline, with attached reference files.
        </p>

        <NewStandardForm />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load standards: {error.message}
          </p>
        ) : (
          <Table aria-label="Standards" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Discipline</TableHeader>
                <TableHeader>Title</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(standards ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Tag type="blue" size="sm">
                      {s.discipline}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Link href={`/standards/${s.id}`}>{s.title}</Link>
                  </TableCell>
                </TableRow>
              ))}
              {(standards ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No standards yet.
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
