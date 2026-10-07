import Link from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Layers, Time, DocumentAdd, Send, Checkmark, Document } from "@carbon/icons-react";
import { createClient } from "../../../../lib/supabase/server";
import { signCoverUrls } from "../../../../lib/projects/covers";
import { placeholderFor } from "../../../../lib/projects/placeholder";
import { CollabSubmissionForm } from "../../../../components/aorms/CollabSubmissionForm";
import { CollabTaskCompleteButton } from "../../../../components/aorms/CollabTaskCompleteButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { PhaseStrip } from "../../../../components/aorms/PhaseStrip";
import { KpiTile } from "../../../../components/aorms/KpiTile";
import { SheetEmptyRow, SheetFacts, SheetGroup, SheetPane, SheetSub } from "../../../../components/aorms/PortalSheet";

/**
 * Collaborator Portal project sheet — port of backend/src/modules/consultant/portal.ts's `projectDetail` +
 * `mySubmissions` + `assignedTasks`, trimmed to what this first pass covers (see migration 0021's header comment:
 * running bills, site visits, joint measurements and the activity feed are deferred).
 *
 * Layout (2026-10-07): the same sheet as the Client Portal — header → KPI rail (left, sticky) → phase strip → the
 * project's cover image → the record in two numbered groups (Your work · Documents) beside a side pane (tasks waiting
 * on you, the project's facts, the latest reply from the studio).
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
    .select("id, ref, title, status, project_type, jurisdiction, current_phase_id, city, state, date_start, cover_image_key")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    return (
      <Grid>
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

  // Cover image: signed URL only after the RLS-scoped project read above succeeded.
  const coverUrl = project.cover_image_key ? ((await signCoverUrls([project.cover_image_key])).get(project.cover_image_key) ?? null) : null;

  const phaseList = phases ?? [];
  const phaseIndex = Math.max(0, phaseList.findIndex((p) => p.id === project.current_phase_id));

  const openTasks = (tasks ?? []).filter((t) => t.status !== "RESOLVED");
  const doneTasks = (tasks ?? []).length - openTasks.length;
  const openSubmissions = (submissions ?? []).filter((s) => s.status === "OPEN").length;
  const lastReply = (submissions ?? []).find((s) => s.response_note);

  const started = project.date_start
    ? new Date(`${project.date_start}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const facts: [string, string][] = [
    ["Status", project.status.replaceAll("_", " ")],
    ["Type", project.project_type ?? "—"],
    ["Location", [project.city, project.state].filter(Boolean).join(", ") || project.jurisdiction || "—"],
    ["Started", started],
  ];

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader eyebrow={project.ref} eyebrowMono title={project.title} result="Information shared without chasing." />

        <div className="aorms-rail-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9rem)", gap: "1rem", marginBottom: "2rem" }}>
          <KpiTile label="Phase" value={phaseList.length ? `${phaseIndex + 1} of ${phaseList.length}` : "—"} icon={Layers} />
          <KpiTile label="Tasks for you" value={openTasks.length} icon={Time} status={openTasks.length > 0 ? "NEEDS_INTERVENTION" : undefined} href="#tasks" />
          <KpiTile label="Tasks done" value={doneTasks} icon={Checkmark} href="#tasks" />
          <KpiTile label="Open submissions" value={openSubmissions} icon={Send} href="#submissions" />
          <KpiTile label="Drawings issued" value={(drawings ?? []).length} icon={DocumentAdd} href="#drawings" />
          <KpiTile label="Transmittals" value={(transmittals ?? []).length} icon={Document} href="#transmittals" />
        </div>

        <div id="phases">
          {phaseList.length > 0 ? (
            <PhaseStrip steps={phaseList.map((ph) => ph.label)} currentIndex={phaseIndex} />
          ) : (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1.5rem" }}>
              Phases will appear here once the project plan is published.
            </p>
          )}
        </div>

        <div className="aorms-cp__hero">
          <div className="aorms-pcard__media">
            {/* Signed Supabase URL or static placeholder — plain <img>, not next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl ?? placeholderFor(project.ref)} alt={coverUrl ? `${project.title} cover` : ""} />
          </div>
        </div>

        <div className="aorms-cp">
          <div className="aorms-cp__main">
            <SheetGroup no={1} title="Your work" note="Tasks assigned to you and what you have sent the studio">
              <SheetSub id="tasks">Tasks assigned to you</SheetSub>
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
                      <TableCell>{t.status !== "RESOLVED" && <CollabTaskCompleteButton submissionId={t.id} projectId={projectId} />}</TableCell>
                    </TableRow>
                  ))}
                  {(tasks ?? []).length === 0 && <SheetEmptyRow cols={4}>No tasks assigned yet.</SheetEmptyRow>}
                </TableBody>
              </Table>

              <SheetSub id="submit">Submit an RFI, deliverable or note</SheetSub>
              <CollabSubmissionForm projectId={projectId} />

              <SheetSub id="submissions">Your submissions</SheetSub>
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
                  {(submissions ?? []).length === 0 && <SheetEmptyRow cols={5}>You haven&apos;t submitted anything yet.</SheetEmptyRow>}
                </TableBody>
              </Table>
            </SheetGroup>

            <SheetGroup no={2} title="Documents" note="Drawings and transmittals issued on this project">
              <SheetSub id="drawings">Drawings</SheetSub>
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
                  {(drawings ?? []).length === 0 && <SheetEmptyRow cols={2}>No drawings issued yet.</SheetEmptyRow>}
                </TableBody>
              </Table>

              <SheetSub id="transmittals">Transmittals</SheetSub>
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
                  {(transmittals ?? []).length === 0 && <SheetEmptyRow cols={3}>No transmittals issued yet.</SheetEmptyRow>}
                </TableBody>
              </Table>
            </SheetGroup>
          </div>

          <aside className="aorms-cp__aside" aria-label="Project summary">
            <SheetPane title="Awaiting you">
              {openTasks.length === 0 ? (
                <p className="aorms-cp__pane-empty">Nothing is waiting on you.</p>
              ) : (
                <ul className="aorms-cp__todo">
                  {openTasks.map((t) => (
                    <li key={t.id}>
                      <Link href="#tasks">
                        <Time size={16} aria-hidden /> {t.subject}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SheetPane>
            <SheetPane title="Project">
              <SheetFacts facts={facts} />
            </SheetPane>
            <SheetPane title="Latest reply">
              {lastReply ? (
                <Link href="#submissions" className="aorms-cp__invoice">
                  <span className="aorms-cp__pane-empty">{lastReply.subject}</span>
                  <span style={{ display: "block", fontSize: "0.875rem", marginBlockStart: "0.25rem" }}>{lastReply.response_note}</span>
                </Link>
              ) : (
                <p className="aorms-cp__pane-empty">No reply from the studio yet.</p>
              )}
            </SheetPane>
          </aside>
        </div>
      </Column>
    </Grid>
  );
}
