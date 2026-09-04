import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewSiteInstructionForm } from "../../../components/aorms/NewSiteInstructionForm";

export default async function SiteInstructionsPage() {
  const supabase = await createClient();

  const [{ data: instructions, error }, { data: projects }, { data: contractors }] = await Promise.all([
    supabase
      .from("site_instructions")
      .select("id, ref, subject, issued_at, acknowledged_at, project_offices(title), contractors(name)")
      .order("created_at", { ascending: false }),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase.from("contractors").select("id, name").order("name"),
  ]);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Site Instructions</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Formal instructions issued to contractors on site.
        </p>

        <NewSiteInstructionForm projects={projects ?? []} contractors={contractors ?? []} />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load instructions: {error.message}
          </p>
        ) : (
          <Table aria-label="Site instructions" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Ref</TableHeader>
                <TableHeader>Project</TableHeader>
                <TableHeader>Contractor</TableHeader>
                <TableHeader>Subject</TableHeader>
                <TableHeader>Issued</TableHeader>
                <TableHeader>Acknowledged</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(instructions ?? []).map((s) => {
                const project = Array.isArray(s.project_offices) ? s.project_offices[0] : (s.project_offices as { title: string } | null);
                const contractor = Array.isArray(s.contractors) ? s.contractors[0] : (s.contractors as { name: string } | null);
                return (
                  <TableRow key={s.id}>
                    <TableCell>{s.ref}</TableCell>
                    <TableCell>{project?.title ?? "—"}</TableCell>
                    <TableCell>{contractor?.name ?? "—"}</TableCell>
                    <TableCell>{s.subject}</TableCell>
                    <TableCell>{s.issued_at ?? "—"}</TableCell>
                    <TableCell>{s.acknowledged_at ? new Date(s.acknowledged_at).toLocaleDateString("en-IN") : "—"}</TableCell>
                  </TableRow>
                );
              })}
              {(instructions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No instructions issued yet.
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
