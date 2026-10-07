import Link from "next/link";
import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { Receipt, DocumentAdd, Checkmark, Time, Layers, Document } from "@carbon/icons-react";
import { createClient } from "../../../../lib/supabase/server";
import { signCoverUrls } from "../../../../lib/projects/covers";
import { placeholderFor } from "../../../../lib/projects/placeholder";
import { PortalAcknowledgeButton } from "../../../../components/aorms/PortalAcknowledgeButton";
import { PortalApprovalResponse } from "../../../../components/aorms/PortalApprovalResponse";
import { PortalDecisionResponse } from "../../../../components/aorms/PortalDecisionResponse";
import { PortalSubmissionForms } from "../../../../components/aorms/PortalSubmissionForms";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { PhaseStrip } from "../../../../components/aorms/PhaseStrip";
import { KpiTile } from "../../../../components/aorms/KpiTile";

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

function EmptyRow({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={cols}>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          {children}
        </p>
      </TableCell>
    </TableRow>
  );
}

/** A numbered group of the project sheet — the hierarchy the page was missing: group → section → table. */
function Group({ no, title, note, children }: { no: number; title: string; note: string; children: React.ReactNode }) {
  return (
    <section className="aorms-cp__group" aria-label={title}>
      <header className="aorms-cp__group-head">
        <span className="aorms-cp__group-no">{pad(no)}</span>
        <h2 className="cds--type-heading-03">{title}</h2>
        <span className="aorms-cp__group-note">{note}</span>
      </header>
      {children}
    </section>
  );
}

/**
 * Client Portal project sheet — a port of backend/src/modules/portal/router.ts's `projectDetail` query (see
 * migration 0020's header comment for what's deferred). Every read relies on RLS to enforce project ownership and
 * the status/visibility filter the old backend applied — no app-level re-filtering needed.
 *
 * Layout (2026-10-07 redesign, same anatomy as the Office Hub's project page): header → KPI rail (left, sticky) →
 * phase strip → cover image + facts → the record in four numbered groups (Your response · Money · Documents ·
 * Conversation) beside a side pane (what is waiting on you, the project's facts, the latest invoice). The cover is
 * the project's own image (signed URL, minted only after the RLS-scoped read), else the shared placeholder.
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
    .select("id, ref, title, status, project_type, jurisdiction, current_phase_id, city, state, date_start, site_area_sqm, built_up_area_sqm, floor_count, cover_image_key")
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

  const [
    { data: phases },
    { data: invoices },
    { data: approvals },
    { data: drawings },
    { data: transmittals },
    { data: moms },
    { data: submissions },
    { data: decisions },
  ] = await Promise.all([
    supabase
      .from("phases")
      .select("id, code, label, billing_pct, sort_order")
      .eq("project_id", projectId)
      .order("sort_order"),
    supabase
      .from("invoices")
      .select("id, ref, document_kind, status, grand_total_paise, paid_paise, date_invoice")
      .eq("project_id", projectId)
      .order("date_invoice", { ascending: false }),
    supabase
      .from("approvals")
      .select("id, title, entity_type, status, sent_date, response_date, remarks")
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
    supabase
      .from("decisions")
      .select("id, title, rationale, state, impact")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
  ]);

  // Cover image: signed URL only after the RLS-scoped project read above succeeded.
  const coverUrl = project.cover_image_key ? ((await signCoverUrls([project.cover_image_key])).get(project.cover_image_key) ?? null) : null;

  const phaseList = phases ?? [];
  const phaseIndex = Math.max(0, phaseList.findIndex((p) => p.id === project.current_phase_id));

  const pendingApprovals = (approvals ?? []).filter((a) => a.status === "SENT");
  const pendingDecisions = (decisions ?? []).filter((d) => d.state === "CLIENT_REVIEW");
  const toAcknowledge = (transmittals ?? []).filter((t) => !t.acknowledged_at).length;
  const awaiting = pendingApprovals.length + pendingDecisions.length;

  const invoiceList = invoices ?? [];
  const invoicedPaise = invoiceList.reduce((s, i) => s + (i.grand_total_paise ?? 0), 0);
  const outstandingPaise = invoiceList
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + Math.max(0, (i.grand_total_paise ?? 0) - (i.paid_paise ?? 0)), 0);
  const nextInvoice = invoiceList.find((i) => i.status !== "PAID");

  const area = (v: number | null) => (v ? `${Math.round(v).toLocaleString("en-IN")} m²` : "—");
  const started = project.date_start
    ? new Date(`${project.date_start}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
    : "—";
  const facts: [string, string][] = [
    ["Status", project.status.replaceAll("_", " ")],
    ["Type", project.project_type ?? "—"],
    ["Location", [project.city, project.state].filter(Boolean).join(", ") || project.jurisdiction || "—"],
    ["Started", started],
    ["Site", area(project.site_area_sqm)],
    ["Built-up", area(project.built_up_area_sqm)],
    ["Floors", project.floor_count ? (project.floor_count === 1 ? "G" : `G+${project.floor_count - 1}`) : "—"],
  ];

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader eyebrow={project.ref} eyebrowMono title={project.title} result="Where your project stands." />

        {/* KPI rail — the left, sticky column on wide screens; two-up numerals above the page below `lg`. */}
        <div className="aorms-rail-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9rem)", gap: "1rem", marginBottom: "2rem" }}>
          <KpiTile label="Phase" value={phaseList.length ? `${phaseIndex + 1} of ${phaseList.length}` : "—"} icon={Layers} />
          <KpiTile label="Awaiting you" value={awaiting} icon={Time} status={awaiting > 0 ? "NEEDS_INTERVENTION" : undefined} href="#approvals" />
          <KpiTile label="Invoiced" value={formatInr(invoicedPaise)} icon={Receipt} href="#invoices" />
          <KpiTile label="Outstanding" value={formatInr(outstandingPaise)} icon={Receipt} status={outstandingPaise > 0 ? "WATCH" : undefined} href="#invoices" />
          <KpiTile label="Drawings issued" value={(drawings ?? []).length} icon={DocumentAdd} href="#drawings" />
          <KpiTile label="To acknowledge" value={toAcknowledge} icon={Checkmark} href="#transmittals" />
        </div>

        <div id="phases">
          {phaseList.length > 0 ? (
            <PhaseStrip steps={phaseList.map((ph) => ph.label)} currentIndex={phaseIndex} />
          ) : (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1.5rem" }}>
              Phases will appear here once your project plan is published.
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
            <Group no={1} title="Your response" note="Approvals and decisions the studio is waiting on">
              <h3 id="approvals" className="aorms-cp__sub">
                Approvals
              </h3>
              <Table aria-label="Approvals" className="aorms-table-spaced" size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Type</TableHeader>
                    <TableHeader>Sent</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Your response</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(approvals ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.entity_type ?? "—"}</TableCell>
                      <TableCell>{a.sent_date ?? "—"}</TableCell>
                      <TableCell>
                        <Tag type={a.status === "APPROVED" ? "green" : a.status === "REJECTED" ? "red" : a.status === "REVISIONS" ? "purple" : "blue"} size="sm">
                          {a.status}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        {a.status === "SENT" ? (
                          <PortalApprovalResponse approvalId={a.id} projectId={project.id} />
                        ) : a.response_date ? (
                          <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                            {a.response_date}
                            {a.remarks ? ` — ${a.remarks}` : ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(approvals ?? []).length === 0 && <EmptyRow cols={5}>Nothing sent for your approval yet.</EmptyRow>}
                </TableBody>
              </Table>

              <h3 id="decisions" className="aorms-cp__sub">
                Decisions for your review
              </h3>
              <Table aria-label="Decisions" className="aorms-table-spaced" size="sm">
                <TableHead>
                  <TableRow>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Impact</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Your response</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(decisions ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div>{d.title}</div>
                        <div className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                          {d.rationale}
                        </div>
                      </TableCell>
                      <TableCell>{d.impact}</TableCell>
                      <TableCell>
                        <Tag type={d.state === "ACCEPTED" ? "green" : d.state === "REJECTED" ? "red" : d.state === "LOCKED" ? "purple" : "teal"} size="sm">
                          {d.state}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        {d.state === "CLIENT_REVIEW" ? (
                          <PortalDecisionResponse decisionId={d.id} projectId={project.id} />
                        ) : d.state === "ACCEPTED" || d.state === "REJECTED" || d.state === "LOCKED" ? (
                          <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                            Responded
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(decisions ?? []).length === 0 && <EmptyRow cols={4}>Nothing sent for your review yet.</EmptyRow>}
                </TableBody>
              </Table>
            </Group>

            <Group no={2} title="Money" note="Invoices issued to you">
              <h3 id="invoices" className="aorms-cp__sub">
                Invoices
              </h3>
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
                  {invoiceList.map((inv) => (
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
                  {invoiceList.length === 0 && <EmptyRow cols={5}>No invoices issued yet.</EmptyRow>}
                </TableBody>
              </Table>
            </Group>

            <Group no={3} title="Documents" note="Drawings, transmittals and meeting minutes issued to you">
              <h3 id="drawings" className="aorms-cp__sub">
                Drawings
              </h3>
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
                  {(drawings ?? []).length === 0 && <EmptyRow cols={3}>No drawings issued yet.</EmptyRow>}
                </TableBody>
              </Table>

              <h3 id="transmittals" className="aorms-cp__sub">
                Transmittals
              </h3>
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
                  {(transmittals ?? []).length === 0 && <EmptyRow cols={4}>No transmittals issued yet.</EmptyRow>}
                </TableBody>
              </Table>

              <h3 id="minutes" className="aorms-cp__sub">
                Meeting minutes
              </h3>
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
                  {(moms ?? []).length === 0 && <EmptyRow cols={4}>No meeting minutes issued yet.</EmptyRow>}
                </TableBody>
              </Table>
            </Group>

            <Group no={4} title="Conversation" note="Write to the studio and follow what you have sent">
              <h3 id="contact" className="aorms-cp__sub">
                Get in touch
              </h3>
              <PortalSubmissionForms projectId={projectId} />

              <h3 className="aorms-cp__sub">Your submissions</h3>
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
                  {(submissions ?? []).length === 0 && <EmptyRow cols={5}>You haven&apos;t submitted anything yet.</EmptyRow>}
                </TableBody>
              </Table>
            </Group>
          </div>

          {/* Side pane — what is waiting on the client, the project's facts, and the next invoice. */}
          <aside className="aorms-cp__aside" aria-label="Project summary">
            <section className="aorms-cp__pane">
              <h2 className="aorms-cp__pane-title">Awaiting you</h2>
              {awaiting + toAcknowledge === 0 ? (
                <p className="aorms-cp__pane-empty">Nothing is waiting on you.</p>
              ) : (
                <ul className="aorms-cp__todo">
                  {pendingApprovals.map((a) => (
                    <li key={a.id}>
                      <Link href="#approvals">
                        <Time size={16} aria-hidden /> Approve — {a.title}
                      </Link>
                    </li>
                  ))}
                  {pendingDecisions.map((d) => (
                    <li key={d.id}>
                      <Link href="#decisions">
                        <Time size={16} aria-hidden /> Decide — {d.title}
                      </Link>
                    </li>
                  ))}
                  {toAcknowledge > 0 && (
                    <li>
                      <Link href="#transmittals">
                        <Document size={16} aria-hidden /> Acknowledge {toAcknowledge} transmittal{toAcknowledge === 1 ? "" : "s"}
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </section>

            <section className="aorms-cp__pane">
              <h2 className="aorms-cp__pane-title">Project</h2>
              <dl className="aorms-cp__facts">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="aorms-cp__pane">
              <h2 className="aorms-cp__pane-title">Next invoice</h2>
              {nextInvoice ? (
                <Link href="#invoices" className="aorms-cp__invoice">
                  <span className="aorms-cp__invoice-amount">{formatInr(Math.max(0, (nextInvoice.grand_total_paise ?? 0) - (nextInvoice.paid_paise ?? 0)))}</span>
                  <span className="aorms-cp__pane-empty">
                    {nextInvoice.ref} · {nextInvoice.date_invoice ?? "undated"}
                  </span>
                </Link>
              ) : (
                <p className="aorms-cp__pane-empty">No invoice is due.</p>
              )}
            </section>
          </aside>
        </div>
      </Column>
    </Grid>
  );
}
