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
import { AddJobApplicationForm } from "../../../components/aorms/AddJobApplicationForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { JobApplicationStatusSelect } from "../../../components/aorms/JobApplicationStatusSelect";
import { PageHeader } from "../../../components/aorms/PageHeader";

export default async function JobApplicationsPage() {
  const supabase = await createClient();

  const { data: applications, error } = await supabase
    .from("job_applications")
    .select("id, name, applied_role, email, phone, experience_years, status, applied_at")
    .order("applied_at", { ascending: false });

  return (
    <ContextPanelLayout>
      <ContextPanel title="New application" description="Log a job application.">
        <AddJobApplicationForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Job Applications"
              description="Recruitment pipeline. Resume upload isn't wired up — same register-only pattern used elsewhere until an upload Route Handler exists."
              actions={<ContextPanelTrigger size="sm">Add application</ContextPanelTrigger>}
            />

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load applications: {error.message}
              </p>
            ) : (
              <Table aria-label="Job applications" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Applied role</TableHeader>
                    <TableHeader>Contact</TableHeader>
                    <TableHeader>Experience</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(applications ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.name}</TableCell>
                      <TableCell>{a.applied_role}</TableCell>
                      <TableCell>{a.email ?? a.phone ?? "—"}</TableCell>
                      <TableCell>{a.experience_years != null ? `${a.experience_years} yrs` : "—"}</TableCell>
                      <TableCell>
                        <JobApplicationStatusSelect applicationId={a.id} status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(applications ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No applications yet.
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
