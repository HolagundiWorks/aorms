import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddTeamForm } from "../../../components/aorms/AddTeamForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function TeamsPage() {
  const supabase = await createClient();

  const { data: teams, error } = await supabase.from("teams").select("id, name, description").order("name");

  const rows = teams ?? [];

  return (
    <ContextPanelLayout>
      <ContextPanel title="New team" description="Group team members together.">
        <AddTeamForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Teams"
              description="Groupings of team members — creation is owner-only, matching the current backend."
              actions={<ContextPanelTrigger size="sm">Add team</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total teams" value={rows.length} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load teams: {error.message}
              </p>
            ) : (
              <Table aria-label="Teams" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Description</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(teams ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link href={`/teams/${t.id}`}>{t.name}</Link>
                      </TableCell>
                      <TableCell>{t.description ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(teams ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No teams yet.
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
