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
  ] = await Promise.all([
    supabase
      .from("project_offices")
      .select(
        "id, ref, title, project_type, work_type, status, city, contact_email, contact_phone, clients(name, email, phone, contact_person)",
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
              description={
                <>
                  {clientName ?? "No client"} · {project.project_type} · {project.work_type}
                  {project.city ? ` · ${project.city}` : ""}
                </>
              }
              actions={<ProjectStatusSelect projectId={project.id} status={project.status} />}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Phases" value={(phases ?? []).length} icon={Task} />
              <KpiTile label="Open tasks" value={openTaskCount ?? 0} icon={ListChecked} />
              <KpiTile label="Decisions logged" value={(decisionStates ?? []).length} icon={Task} />
              <KpiTile label="Awaiting client" value={decisionsAwaitingClient} icon={Time} />
            </div>

            {/* "One project, one operating record" (2026-09-15) — the
                rest of what this project's record actually is: meetings,
                documents, approvals, fees, invoices, team, and activity,
                each a real count from that field's own table, one click
                from its own module rather than a second search. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Meetings" value={meetingsCount ?? 0} icon={Calendar} href="/moms" />
              <KpiTile label="Documents" value={documentsCount ?? 0} icon={Document} href="/drawings" />
              <KpiTile label="Approvals" value={approvalsCount ?? 0} icon={CheckmarkOutline} href="/approvals" />
              <KpiTile label="Fees" value={formatInr(totalFeesPaise)} icon={CurrencyRupee} href="/proposals" />
              <KpiTile label="Invoices" value={formatInr(totalInvoicedPaise)} icon={Wallet} href="/invoices" />
              <KpiTile label="Team" value={teamCount ?? 0} icon={UserMultiple} href="/team-members" />
              <KpiTile label="Activity" value={activityCount ?? 0} icon={Activity} href="/audit-log" />
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
