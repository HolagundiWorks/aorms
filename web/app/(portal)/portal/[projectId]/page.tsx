import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { PortalAcknowledgeButton } from "../../../../components/aorms/PortalAcknowledgeButton";
import { PortalSubmissionForms } from "../../../../components/aorms/PortalSubmissionForms";

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

/**
 * Client Portal project detail — port of backend/src/modules/portal/
 * router.ts's `projectDetail` query, trimmed to the fields this first pass
 * covers (see migration 0020's header comment for what's deferred: running
 * bills, inspections, site visits, tenders, steel certs, RA bills, and the
 * activity feed). Every read below relies on RLS to enforce both project
 * ownership and the same status/visibility filter the old backend's
 * lib/sync/hubPortal.ts helpers applied — no app-level re-filtering needed.
 */
export default async function PortalProjectDetailPage({
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

  const [
    { data: phases },
    { data: invoices },
    { data: approvals },
    { data: drawings },
    { data: transmittals },
    { data: moms },
    { data: submissions },
  ] = await Promise.all([
    supabase
      .from("phases")
      .select("id, code, label, billing_pct, sort_order")
      .eq("project_id", projectId)
      .order("sort_order"),
    supabase
      .from("invoices")
      .select("id, ref, document_kind, status, grand_total_paise, date_invoice")
      .eq("project_id", projectId)
      .order("date_invoice", { ascending: false }),
    supabase
      .from("approvals")
      .select("id, title, entity_type, status, sent_date, response_date")
      .eq("project_id", projectId)
      .order("sent_date", { ascending: false }),
    supabase
      .from("drawings")
      .select("id, ref, title, status")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("transmittals")
      .select("id, ref, recipient, purpose, channel, date_issued, acknowledged_at")
      .eq("project_id", projectId)
      .order("date_issued", { ascending: false }),
    supabase
      .from("moms")
      .select("id, ref, title, meeting_date, venue")
      .eq("project_id", projectId)
      .order("meeting_date", { ascending: false }),
    supabase
      .from("portal_submissions")
      .select("id, kind, subject, status, response_note, created_at")
      .eq("project_id", projectId)
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
          Invoices
        </h2>
        <Table aria-label="Invoices" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Amount</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(invoices ?? []).map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.ref}</TableCell>
                <TableCell>{inv.document_kind ?? "—"}</TableCell>
                <TableCell>{inv.date_invoice ?? "—"}</TableCell>
                <TableCell>{formatInr(inv.grand_total_paise)}</TableCell>
                <TableCell>
                  <Tag type={inv.status === "PAID" ? "green" : "blue"} size="sm">
                    {inv.status}
                  </Tag>
                </TableCell>
              </TableRow>
            ))}
            {(invoices ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No invoices issued yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Approvals
        </h2>
        <Table aria-label="Approvals" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Title</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Sent</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(approvals ?? []).map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.title}</TableCell>
                <TableCell>{a.entity_type ?? "—"}</TableCell>
                <TableCell>{a.sent_date ?? "—"}</TableCell>
                <TableCell>
                  <Tag type={a.status === "APPROVED" ? "green" : a.status === "REJECTED" ? "red" : "blue"} size="sm">
                    {a.status}
                  </Tag>
                </TableCell>
              </TableRow>
            ))}
            {(approvals ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    Nothing sent for your approval yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Drawings
        </h2>
        <Table aria-label="Drawings" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(drawings ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.ref}</TableCell>
                <TableCell>{d.title}</TableCell>
                <TableCell>
                  <PortalAcknowledgeButton projectId={projectId} objectType="drawing" objectId={d.id} subject={`Drawing ${d.ref}: ${d.title}`} />
                </TableCell>
              </TableRow>
            ))}
            {(drawings ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
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
              <TableHeader>Action</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(transmittals ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.ref}</TableCell>
                <TableCell>{t.purpose ?? "—"}</TableCell>
                <TableCell>{t.date_issued ?? "—"}</TableCell>
                <TableCell>
                  {t.acknowledged_at ? (
                    <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                      Acknowledged
                    </span>
                  ) : (
                    <PortalAcknowledgeButton projectId={projectId} objectType="transmittal" objectId={t.id} subject={`Transmittal ${t.ref}`} />
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(transmittals ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No transmittals issued yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Meeting minutes
        </h2>
        <Table aria-label="Meeting minutes" className="aorms-table-spaced" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Ref</TableHeader>
              <TableHeader>Title</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Venue</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {(moms ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.ref}</TableCell>
                <TableCell>{m.title}</TableCell>
                <TableCell>{m.meeting_date ?? "—"}</TableCell>
                <TableCell>{m.venue ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(moms ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No meeting minutes issued yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <h2 className="cds--type-heading-03" style={{ margin: "2rem 0 1rem" }}>
          Get in touch
        </h2>
        <PortalSubmissionForms projectId={projectId} />

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
                <TableCell>{s.kind.replace(/_/g, " ")}</TableCell>
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
