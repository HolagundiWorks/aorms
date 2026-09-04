import Link from "next/link";
import {
  Column,
  Grid,
  InlineNotification,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewTeamMemberForm } from "../../../components/aorms/NewTeamMemberForm";

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function TeamMembersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const isOwner = profile?.role === "OWNER";

  const { data: members, error } = await supabase
    .from("team_members")
    .select("id, name, role, job_title, employment_type, monthly_salary_paise, active")
    .order("name");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Team Members</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Firm roster. Adding a team member is owner-only, matching the current backend&apos;s
          own gate.
        </p>

        {isOwner ? (
          <NewTeamMemberForm />
        ) : (
          <div style={{ marginBottom: "1.5rem" }}>
            <InlineNotification
              kind="info"
              title="Owner access required"
              subtitle="Only the firm owner can add team members."
              hideCloseButton
              lowContrast
            />
          </div>
        )}

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load team members: {error.message}
          </p>
        ) : (
          <Table aria-label="Team members" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Job title</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Monthly salary</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(members ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/team-members/${m.id}`}>{m.name}</Link>
                  </TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>{m.job_title ?? "—"}</TableCell>
                  <TableCell>{m.employment_type}</TableCell>
                  <TableCell>{formatInr(m.monthly_salary_paise)}</TableCell>
                  <TableCell>
                    <Tag type={m.active ? "green" : "gray"} size="sm">
                      {m.active ? "Active" : "Inactive"}
                    </Tag>
                  </TableCell>
                </TableRow>
              ))}
              {(members ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No team members yet.
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
