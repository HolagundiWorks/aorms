import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewTeamForm } from "../../../components/aorms/NewTeamForm";

export default async function TeamsPage() {
  const supabase = await createClient();

  const { data: teams, error } = await supabase.from("teams").select("id, name, description").order("name");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Teams</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Groupings of team members — creation is owner-only, matching the current backend.
        </p>

        <NewTeamForm />

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
  );
}
