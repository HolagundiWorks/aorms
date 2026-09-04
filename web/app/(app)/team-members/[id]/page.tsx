import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewAssignmentForm } from "../../../../components/aorms/hr/NewAssignmentForm";
import { NewLeaveForm } from "../../../../components/aorms/hr/NewLeaveForm";
import { LeaveStatusSelect } from "../../../../components/aorms/hr/LeaveStatusSelect";
import { NewAttendanceForm } from "../../../../components/aorms/hr/NewAttendanceForm";
import { NewRewardPointsForm } from "../../../../components/aorms/hr/NewRewardPointsForm";
import { HrProfileForm } from "../../../../components/aorms/hr/HrProfileForm";
import { NewHrDocumentForm } from "../../../../components/aorms/hr/NewHrDocumentForm";

export default async function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: member, error: memberError },
    { data: projects },
    { data: assignments },
    { data: leaves },
    { data: attendance },
    { data: rewards },
    { data: hrProfile },
    { data: hrDocuments },
  ] = await Promise.all([
    supabase.from("team_members").select("id, name, role, job_title, employment_type").eq("id", id).maybeSingle(),
    supabase.from("project_offices").select("id, title").order("title"),
    supabase
      .from("assignments")
      .select("id, role, project_offices(title)")
      .eq("team_member_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("leaves").select("id, type, from_date, to_date, days, status").eq("team_member_id", id).order("from_date", { ascending: false }),
    supabase
      .from("attendance")
      .select("id, attendance_date, status, notes")
      .eq("team_member_id", id)
      .order("attendance_date", { ascending: false })
      .limit(30),
    supabase.from("reward_points").select("id, points, reason, created_at").eq("team_member_id", id).order("created_at", { ascending: false }),
    supabase.from("hr_profiles").select("*").eq("member_id", id).maybeSingle(),
    supabase.from("hr_documents").select("id, document_type, document_name, issue_date, expiry_date").eq("member_id", id).order("created_at", { ascending: false }),
  ]);

  if (memberError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load team member: {memberError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!member) notFound();

  const totalPoints = (rewards ?? []).reduce((sum, r) => sum + r.points, 0);

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {member.role}
          {member.job_title ? ` · ${member.job_title}` : ""} · {member.employment_type}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1.5rem" }}>
          {member.name}
        </h1>

        <Tabs>
          <TabList aria-label="Team member sections">
            <Tab>Assignments</Tab>
            <Tab>Leaves</Tab>
            <Tab>Attendance</Tab>
            <Tab>Rewards ({totalPoints})</Tab>
            <Tab>HR Profile</Tab>
            <Tab>Documents</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewAssignmentForm memberId={member.id} projects={projects ?? []} />
                <Table aria-label="Assignments" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Project</TableHeader>
                      <TableHeader>Role</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(assignments ?? []).map((a) => {
                      const project = Array.isArray(a.project_offices) ? a.project_offices[0] : (a.project_offices as { title: string } | null);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{project?.title ?? "—"}</TableCell>
                          <TableCell>{a.role}</TableCell>
                        </TableRow>
                      );
                    })}
                    {(assignments ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No assignments yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewLeaveForm memberId={member.id} />
                <Table aria-label="Leaves" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>From</TableHeader>
                      <TableHeader>To</TableHeader>
                      <TableHeader>Days</TableHeader>
                      <TableHeader>Status</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(leaves ?? []).map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.type}</TableCell>
                        <TableCell>{l.from_date}</TableCell>
                        <TableCell>{l.to_date}</TableCell>
                        <TableCell>{l.days}</TableCell>
                        <TableCell>
                          <LeaveStatusSelect memberId={member.id} leaveId={l.id} status={l.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(leaves ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No leave requests yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewAttendanceForm memberId={member.id} />
                <Table aria-label="Attendance" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Date</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Notes</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(attendance ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.attendance_date}</TableCell>
                        <TableCell>
                          <Tag type={a.status === "PRESENT" ? "green" : a.status === "ABSENT" ? "red" : "gray"} size="sm">
                            {a.status}
                          </Tag>
                        </TableCell>
                        <TableCell>{a.notes ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(attendance ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No attendance marked yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewRewardPointsForm memberId={member.id} />
                <Table aria-label="Reward points" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>When</TableHeader>
                      <TableHeader>Points</TableHeader>
                      <TableHeader>Reason</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(rewards ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.created_at).toLocaleDateString("en-IN")}</TableCell>
                        <TableCell>{r.points}</TableCell>
                        <TableCell>{r.reason}</TableCell>
                      </TableRow>
                    ))}
                    {(rewards ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No reward points yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <HrProfileForm memberId={member.id} values={hrProfile ?? null} />
              </div>
            </TabPanel>

            <TabPanel>
              <div style={{ paddingTop: "1.5rem" }}>
                <NewHrDocumentForm memberId={member.id} />
                <Table aria-label="HR documents" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Type</TableHeader>
                      <TableHeader>Name</TableHeader>
                      <TableHeader>Issue date</TableHeader>
                      <TableHeader>Expiry date</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(hrDocuments ?? []).map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.document_type}</TableCell>
                        <TableCell>{d.document_name}</TableCell>
                        <TableCell>{d.issue_date ?? "—"}</TableCell>
                        <TableCell>{d.expiry_date ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {(hrDocuments ?? []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                            No documents registered yet.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Column>
    </Grid>
  );
}
