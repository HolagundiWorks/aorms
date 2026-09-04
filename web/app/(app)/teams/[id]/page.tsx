import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewTeamMembershipForm } from "../../../../components/aorms/NewTeamMembershipForm";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: team, error: teamError }, { data: memberships }, { data: allMembers }] = await Promise.all([
    supabase.from("teams").select("id, name, description").eq("id", id).maybeSingle(),
    supabase.from("team_memberships").select("id, team_members(id, name, role)").eq("team_id", id),
    supabase.from("team_members").select("id, name").order("name"),
  ]);

  if (teamError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load team: {teamError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!team) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {team.name}
        </h1>
        {team.description && (
          <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
            {team.description}
          </p>
        )}

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Members
        </h2>

        <NewTeamMembershipForm teamId={team.id} members={allMembers ?? []} />

        <Table aria-label="Team members" className="aorms-table-spaced">
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Role</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(memberships ?? []).map((m) => {
              const member = Array.isArray(m.team_members) ? m.team_members[0] : (m.team_members as { name: string; role: string } | null);
              return (
                <TableRow key={m.id}>
                  <TableCell>{member?.name ?? "—"}</TableCell>
                  <TableCell>{member?.role ?? "—"}</TableCell>
                </TableRow>
              );
            })}
            {(memberships ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No members yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Column>
    </Grid>
  );
}
