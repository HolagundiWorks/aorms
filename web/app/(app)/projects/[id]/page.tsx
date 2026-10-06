import { ListChecked, Task, Time, Calendar, Document, CheckmarkOutline, CurrencyRupee, Wallet, UserMultiple, Activity } from "@carbon/icons-react";
import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tile,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { AddPhaseForm } from "../../../../components/aorms/AddPhaseForm";
import { ProjectStatusSelect } from "../../../../components/aorms/ProjectStatusSelect";
import { ActivationGate } from "../../../../components/aorms/ActivationGate";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../../components/aorms/ContextPanel";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { KpiTile } from "../../../../components/aorms/KpiTile";
import { placeholderFor } from "../../../../lib/projects/placeholder";
import { PhaseStrip } from "../../../../components/aorms/PhaseStrip";
import Link from "next/link";
import { CoverImageControl } from "../../../../components/aorms/CoverImageControl";
import { signCoverUrls } from "../../../../lib/projects/covers";
import { getActivationGate } from "../../../../lib/actions/activation";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: project, error: projectError },
    { data: phases, error: phasesError },
    { count: openTaskCount },
    { data: decisionStates },
    { count: meetingsCount },
    { count: documentsCount },
    { count: approvalsCount },
    { data: proposalFees },
    { data: invoiceTotals },
    { count: teamCount },
    { count: activityCount },
    { count: estimatesCount },
    { count: tendersCount },
    { count: snagsCount },
    { count: doneTaskCount },
  ] = await Promise.all([
    supabase
      .from("project_offices")
      .select(
        "id, ref, title, project_type, work_type, status, city, contact_email, contact_phone, state, district, site_address, date_start, site_area_sqm, built_up_area_sqm, floor_count, cover_image_key, current_phase_id, clients(name, email, phone, contact_person)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("phases")
      .select("id, code, label, billing_pct, sort_order, revision_budget")
      .eq("project_id", id)
      .order("sort_order"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", id).neq("status", "DONE"),
    supabase.from("decisions").select("state").eq("project_id", id),
    // "One project, one operating record" consolidation (2026-09-15) —
    // closes a real cross-verification gap: 7 of the marketing page's
    // own 12 listed fields (Meetings, Documents, Approvals, Fees,
    // Invoices, Team, Activity) lived only in separate, unlinked
    // top-level modules — the "one page, not a search" claim wasn't
    // actually true for most of what it listed. Each of these is a
    // genuine count/total from that field's own real table, filtered to
    // this project — not new data, just surfaced here too.
    supabase.from("moms").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("drawings").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("approvals").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("proposals").select("fee_paise").eq("project_id", id),
    supabase.from("invoices").select("grand_total_paise").eq("project_id", id),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("audit_log").select("id", { count: "exact", head: true }).eq("entity", "project").eq("entity_id", id),
    supabase.from("estimates").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("tenders").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("snags").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "DONE"),
  ]);

  if (projectError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load project: {projectError.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!project) notFound();

  // Cover image: signed URL only after the RLS-scoped project read above
  // succeeded; the upload control is shown to write-tier roles only (the
  // Server Action re-checks and RLS is the real gate).
  const coverUrl = project.cover_image_key ? ((await signCoverUrls([project.cover_image_key])).get(project.cover_image_key) ?? null) : null;
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const { data: viewerProfile } = viewer ? await supabase.from("profiles").select("role").eq("id", viewer.id).maybeSingle() : { data: null };
  const canEditCover = !!viewerProfile && ["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"].includes(viewerProfile.role);

  type ClientInfo = { name: string; email: string | null; phone: string | null; contact_person: string | null };
  const client: ClientInfo | null = Array.isArray(project.clients)
    ? (project.clients[0] ?? null)
    : (project.clients as ClientInfo | null);
  const clientName = client?.name;

  const gate = await getActivationGate(project.id);
  const decisionsAwaitingClient = (decisionStates ?? []).filter((d) => d.state === "CLIENT_REVIEW").length;

  const totalFeesPaise = (proposalFees ?? []).reduce((sum, p) => sum + (p.fee_paise ?? 0), 0);
  const totalInvoicedPaise = (invoiceTotals ?? []).reduce((sum, i) => sum + (i.grand_total_paise ?? 0), 0);
  const formatInr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

  const totalTasks = (openTaskCount ?? 0) + (doneTaskCount ?? 0);
  // Phase strip: the project's own phases when it has any (current one from
  // current_phase_id); otherwise the commercial lifecycle.
  const LIFECYCLE = ["Enquiry", "Proposal", "Active", "Completed"];
  const lifecycleIndex = Math.max(0, ["ENQUIRY", "PROPOSAL", "ACTIVE", "COMPLETED"].indexOf(project.status));
  const hasPhases = (phases ?? []).length > 0;
  const phaseSteps = hasPhases ? (phases ?? []).map((ph) => ph.label) : LIFECYCLE;
  const phaseCurrent = hasPhases
    ? Math.max(0, (phases ?? []).findIndex((ph) => ph.id === project.current_phase_id))
    : lifecycleIndex;
  const moduleLinks = [
    { name: "Tasks", href: "/tasks", value: `${openTaskCount ?? 0} open` },
    { name: "Drawings", href: "/drawings", value: documentsCount ?? 0 },
    { name: "Estimates", href: "/estimates", value: estimatesCount ?? 0 },
    { name: "Tenders", href: "/tenders", value: tendersCount ?? 0 },
    { name: "Site snags", href: "/snags", value: snagsCount ?? 0 },
    { name: "Meetings", href: "/moms", value: meetingsCount ?? 0 },
    { name: "Approvals", href: "/approvals", value: approvalsCount ?? 0 },
    { name: "Fees", href: "/proposals", value: formatInr(totalFeesPaise) },
    { name: "Invoiced", href: "/invoices", value: formatInr(totalInvoicedPaise) },
    { name: "Team", href: "/team-members", value: teamCount ?? 0 },
    { name: "Activity", href: "/audit-log", value: activityCount ?? 0 },
  ];

  return (
    <ContextPanelLayout>
      <ContextPanel title="Add phase" description="Add a delivery phase to this project.">
        <AddPhaseForm projectId={project.id} />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              eyebrow={project.ref}
              eyebrowMono
              title={project.title}
              result="A coordinated project record."
              actions={<ProjectStatusSelect projectId={project.id} status={project.status} />}
            />

            {/* Project hub (2026-09-30, "Architectural Operating System"):
                the project as the primary spatial object — where it is in
                its life, its scale as a drawing, and one row linking out to
                everything attached to it. */}
            <PhaseStrip steps={phaseSteps} currentIndex={phaseCurrent} />

            {/* Cover sheet block (2026-09-30): the project's identity fields as
                ruled label/value pairs, like the head of an architectural
                title sheet. Only fields the record actually has are shown. */}
            <dl className="aorms-cover">
              {[
                ["Client", clientName],
                ["Location", [project.city, project.state].filter(Boolean).join(", ") || null],
                ["Type", project.project_type],
                ["Work", project.work_type],
                ["Status", project.status?.replaceAll("_", " ")],
                ["Started", project.date_start ? new Date(project.date_start + "T00:00:00Z").toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).toUpperCase() : null],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k as string}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 20rem) minmax(0, 1fr)", gap: "2rem", marginBottom: "0.5rem" }} className="aorms-hub-head">
              <div style={{ color: "var(--aorms-ink)" }}>
                <div className="aorms-pcard__media" style={{ maxInlineSize: "20rem" }}>
                  {/* Signed Supabase URL or static placeholder — plain <img>, not next/image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl ?? placeholderFor(project.ref)} alt={coverUrl ? `${project.title} cover` : ""} />
                </div>
                {canEditCover && <CoverImageControl projectId={project.id} hasCover={!!project.cover_image_key} />}
              </div>
              <div className="aorms-facts" style={{ alignSelf: "end" }}>
                <div>
                  <span className="aorms-bigstat__label">Site</span>
                  <span className="aorms-facts__figure">{project.site_area_sqm ? `${Math.round(project.site_area_sqm).toLocaleString("en-IN")} m²` : "—"}</span>
                </div>
                <div>
                  <span className="aorms-bigstat__label">Built-up</span>
                  <span className="aorms-facts__figure">{project.built_up_area_sqm ? `${Math.round(project.built_up_area_sqm).toLocaleString("en-IN")} m²` : "—"}</span>
                </div>
                <div>
                  <span className="aorms-bigstat__label">Floors</span>
                  <span className="aorms-facts__figure">{project.floor_count ? (project.floor_count === 1 ? "G" : `G+${project.floor_count - 1}`) : "—"}</span>
                </div>
                <div>
                  <span className="aorms-bigstat__label">Tasks done</span>
                  <span className="aorms-facts__figure">
                    {totalTasks ? `${Math.round(((doneTaskCount ?? 0) / totalTasks) * 100)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>

            <nav className="aorms-module-links" aria-label="Project record">
              {moduleLinks.map((m) => (
                <Link key={m.name} href={m.href} className="aorms-module-link">
                  <span className="aorms-module-link__name">{m.name}</span>
                  <span className="aorms-module-link__value">{m.value}</span>
                </Link>
              ))}
            </nav>

            <div className="aorms-rail-kpis"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 9rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Phases" value={(phases ?? []).length} icon={Task} />
              <KpiTile label="Open tasks" value={openTaskCount ?? 0} icon={ListChecked} />
              <KpiTile label="Decisions logged" value={(decisionStates ?? []).length} icon={Task} />
              <KpiTile label="Awaiting client" value={decisionsAwaitingClient} icon={Time} />
            </div>

            {/* Client + project contact (migration 0044) — the project
                reads the selected client's own info as before (name here,
                email/phone/contact_person below), but contact_email/
                contact_phone are the project's OWN, independent fields:
                day-to-day communication on this specific job may go to a
                different address than the client record's own default.
                Shown only when there's something to show at all. */}
            {(client || project.contact_email || project.contact_phone) && (
              <Tile style={{ marginBottom: "2rem" }}>
                <p className="cds--type-heading-compact-02" style={{ marginBottom: "0.75rem" }}>
                  Contact
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))", gap: "1rem" }}>
                  {client && (
                    <div>
                      <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                        Client — {client.name}
                        {client.contact_person ? ` (c/o ${client.contact_person})` : ""}
                      </p>
                      <p className="cds--type-body-01">{client.email ?? "—"}</p>
                      <p className="cds--type-body-01">{client.phone ?? "—"}</p>
                    </div>
                  )}
                  {(project.contact_email || project.contact_phone) && (
                    <div>
                      <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                        This project (if different from the client&apos;s own)
                      </p>
                      <p className="cds--type-body-01">{project.contact_email ?? "—"}</p>
                      <p className="cds--type-body-01">{project.contact_phone ?? "—"}</p>
                    </div>
                  )}
                </div>
              </Tile>
            )}

            {project.status !== "ACTIVE" && project.status !== "COMPLETED" && project.status !== "CANCELLED" && (
              <>
                <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
                  Activation gate
                </h2>
                <div style={{ marginBottom: "2rem" }}>
                  <ActivationGate projectId={project.id} gate={gate} />
                </div>
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h2 className="cds--type-heading-02">Phases</h2>
              <ContextPanelTrigger size="sm">Add phase</ContextPanelTrigger>
            </div>

            {phasesError ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load phases: {phasesError.message}
              </p>
            ) : (
              <Table aria-label="Phases" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Code</TableHeader>
                    <TableHeader>Label</TableHeader>
                    <TableHeader>Billing %</TableHeader>
                    <TableHeader>Order</TableHeader>
                    <TableHeader>Revision budget</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(phases ?? []).map((ph) => (
                    <TableRow key={ph.id}>
                      <TableCell>{ph.code}</TableCell>
                      <TableCell>{ph.label}</TableCell>
                      <TableCell>{ph.billing_pct}%</TableCell>
                      <TableCell>{ph.sort_order}</TableCell>
                      <TableCell>{ph.revision_budget ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(phases ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No phases yet.
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
