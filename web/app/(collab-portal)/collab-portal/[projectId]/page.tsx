import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { CollabSubmissionForm } from "../../../../components/aorms/CollabSubmissionForm";
import { CollabTaskCompleteButton } from "../../../../components/aorms/CollabTaskCompleteButton";

/**
 * Collaborator Portal project detail — port of backend/src/modules/
 * consultant/portal.ts's `projectDetail` + `mySubmissions` + `assignedTasks`,
 * trimmed to what this first pass covers (see migration 0021's header
 * comment: running bills, site visits, joint measurements and the activity
 * feed are deferred, same as the Client Portal's own first slice).
 */
export default async function CollabPortalProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error: projectError } = await supabase
    .from("project_offices")
    .select("id, ref, title, status, project_type, jurisdiction, current_phase_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load this project: {projectError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!project) notFound();

  const [{ data: phases }, { data: drawings }, { data: transmittals }, { data: submissions }, { data: tasks }] =
    await Promise.all([
      supabase.from("phases").select("id, code, label, billing_pct, sort_order").eq("project_id", projectId).order("sort_order"),
      supabase.from("drawings").select("id, ref, title").eq("project_id", projectId).order("created_at", { ascending: false }),
      supabase
        .from("transmittals")
        .select("id, ref, purpose, date_issued")
        .eq("project_id", projectId)
        .order("date_issued", { ascending: false }),
      supabase
        .from("consultant_submissions")
        .select("id, kind, subject, status, response_note, created_at")
        .eq("project_id", projectId)
        .neq("kind", "TASK")
        .order("created_at", { ascending: false }),
      supabase
        .from("consultant_submissions")
        .select("id, subject, body, status, created_at")
        .eq("project_id", projectId)
        .eq("kind", "TASK")
        .order("created_at", { ascending: false }),
    ]);

  const currentSortOrder = (phases ?? []).find((p) => p.id === project.current_phase_id)?.sort_order ?? -1;

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.25rem" }}>
          {project.ref}
        </p>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {project.title}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
          <Tag type="blue" size="sm">
            {project.status}
          </Tag>
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            {project.project_type ?? "—"} · {project.jurisdiction ?? "—"}
          </span>
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Phases
        </h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2rem" }}>
          {(phases ?? []).map((ph) => {
            const phStatus =
              ph.sort_order < currentSortOrder ? "Complete" : ph.id === project.current_phase_id ? "Active" : "Pending";
            return (
              <Tag key={ph.id} type={phStatus === "Complete" ? "green" : phStatus === "Active" ? "blue" : "cool-gray"} size="sm">
                {ph.label} ({ph.billing_pct}%) — {phStatus}
              </Tag>
            );
          })}
          {(phases ?? []).length === 0 && (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              No phases yet.
            </p>
          )}
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Drawings
        </h2>
        <Table aria-label="Drawings" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(drawings ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.ref}</TableCell>
                <TableCell>{d.title}</TableCell>
              </TableRow>
            ))}
            {(drawings ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={2}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No drawings issued yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Transmittals
        </h2>
        <Table aria-label="Transmittals" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Purpose</TableHeader>
              <TableHeader>Issued</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(transmittals ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.ref}</TableCell>
                <TableCell>{t.purpose ?? "—"}</TableCell>
                <TableCell>{t.date_issued ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(transmittals ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No transmittals issued yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Tasks assigned to you
        </h2>
        <Table aria-label="Assigned tasks" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Subject</TableHeader>
              <TableHeader>Details</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(tasks ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.subject}</TableCell>
                <TableCell>{t.body ?? "—"}</TableCell>
                <TableCell>
                  <Tag type={t.status === "RESOLVED" ? "green" : "cool-gray"} size="sm">
                    {t.status}
                  </Tag>
                </TableCell>
                <TableCell>
                  {t.status !== "RESOLVED" && <CollabTaskCompleteButton submissionId={t.id} projectId={projectId} />}
                </TableCell>
              </TableRow>
            ))}
            {(tasks ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No tasks assigned yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Submit an RFI, deliverable or note
        </h2>
        <CollabSubmissionForm projectId={projectId} />

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Your submissions
        </h2>
        <Table aria-label="Your submissions" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Kind</TableHeader>
              <TableHeader>Subject</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Response</TableHeader>
              <TableHeader>Submitted</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(submissions ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.kind}</TableCell>
                <TableCell>{s.subject}</TableCell>
                <TableCell>
                  <Tag type={s.status === "OPEN" ? "cool-gray" : "blue"} size="sm">
                    {s.status}
                  </Tag>
                </TableCell>
                <TableCell>{s.response_note ?? "—"}</TableCell>
                <TableCell>{new Date(s.created_at).toLocaleDateString("en-IN")}</TableCell>
              </TableRow>
            ))}
            {(submissions ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    You haven&apos;t submitted anything yet.
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
