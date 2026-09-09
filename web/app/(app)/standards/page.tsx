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
import { AddStandardForm } from "../../../components/aorms/AddStandardForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function StandardsPage() {
  const supabase = await createClient();

  const { data: standards, error } = await supabase
    .from("standards")
    .select("id, discipline, title, notes, created_at")
    .order("created_at", { ascending: false });

  return (
    <ContextPanelLayout>
      <ContextPanel title="New standard" description="Add a design standard for a discipline.">
        <AddStandardForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Standards Library"
              description="Design standards by discipline, with attached reference files."
              actions={<ContextPanelTrigger size="sm">Add standard</ContextPanelTrigger>}
            />

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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
