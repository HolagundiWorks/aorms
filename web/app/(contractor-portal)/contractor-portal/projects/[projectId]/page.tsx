import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { CurrencyRupee, Receipt, CheckmarkOutline, ChartLine, Chat } from "@carbon/icons-react";
import { createClient } from "../../../../../lib/supabase/server";
import { placeholderFor } from "../../../../../lib/projects/placeholder";
import { PageHeader } from "../../../../../components/aorms/PageHeader";
import { KpiTile } from "../../../../../components/aorms/KpiTile";
import { SheetEmptyRow, SheetFacts, SheetGroup, SheetPane, SheetSub } from "../../../../../components/aorms/PortalSheet";
import { computeFinalAccount } from "../../../../../lib/billing/final-account";
import { buildMeasurementAbstract } from "../../../../../lib/billing/measurement-abstract";
import { computeCpm, dateForOffset, type Activity } from "../../../../../lib/scheduling/cpm";
import { ContractorMessageForm, ContractorRaBillForm, ContractorRaiseForm } from "../../../../../components/aorms/ContractorProjectForms";

const inr = (paise: number | null | undefined) => (paise == null ? "—" : `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`);
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

const MS_TAG: Record<string, "green" | "blue" | "gray" | "magenta" | "red"> = { COMPLETE: "green", ON_TRACK: "blue", PLANNED: "gray", AT_RISK: "magenta", DELAYED: "red" };
const BILL_LABEL: Record<string, string> = {
  DRAFT: "Submitted — awaiting site check",
  SITE_CHECKED: "Site checked",
  CERTIFIED: "Certified",
  SENT_TO_CLIENT: "Certified, sent to client",
  CLOSED: "Certified and closed",
};
const CERTIFIED = new Set(["CERTIFIED", "SENT_TO_CLIENT", "CLOSED"]);
const KIND_LABEL: Record<string, string> = { TICKET: "Ticket", MEETING_REQUEST: "Meeting", RFI: "RFI", PROGRESS_UPDATE: "Progress", NOTE: "Note", SITE_VISIT: "Site visit", JOINT_MEASUREMENT: "Joint measurement" };
const SUB_TAG: Record<string, "red" | "blue" | "green" | "gray"> = { OPEN: "red", RESPONDED: "blue", RESOLVED: "green" };

type Project = {
  project_id: string;
  project_ref: string;
  project_title: string;
  project_status: string;
  city: string | null;
  package_id: string | null;
  package_ref: string | null;
  package_title: string | null;
  trade: string | null;
  package_status: string | null;
  contract_value_paise: number | null;
};

/**
 * Contractor Portal current-project sheet (2026-10-08). A project is "current" when the contractor holds an awarded
 * package (or awarded tender) on it. The page shows only what RLS lets the contractor read: issued drawings with their
 * revision history, the programme, their own bills, tickets and message threads — and the cost position derived from
 * the package value and their bills (no figures about the client's side of the project).
 */
export default async function ContractorProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: projectRows } = await supabase.rpc("my_contractor_projects");
  const rows = ((projectRows ?? []) as Project[]).filter((r) => r.project_id === projectId);
  if (rows.length === 0) notFound();
  const project = rows[0];
  const pkg = rows.find((r) => r.package_id) ?? null;

  const [{ data: drawings }, { data: milestones }, { data: bills }, { data: submissions }, { data: variations }, { data: steel }] = await Promise.all([
    supabase.from("drawings").select("id, ref, title, rev_no, root_id, is_current, revision_note, created_at, storage_key").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("pmc_milestones").select("id, ref, title, planned_date, actual_date, percent_complete, status, notes, duration_days, predecessor_id, dep_type, lag_days").eq("project_id", projectId).order("sort_order"),
    supabase.from("pmc_ra_bills").select("id, ref, bill_no, period_start, period_end, status, gross_paise, advance_recovery_paise, retention_paise, other_deduction_paise, narrative, attachment_key, paid_paise, paid_at, gst_paise, tds_paise, cess_paise, gst_tds_paise").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("contractor_submissions").select("id, kind, subject, body, status, response_note, created_at, meeting_at, meeting_place, storage_key, file_name, percent_complete, applied_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("pmc_variations").select("id, ref, title, amount_paise, approved_at").eq("project_id", projectId).order("created_at"),
    supabase.from("pmc_steel_certs").select("id, ref, period_start, period_end, issued_kg, consumed_kg, wastage_pct, narrative").eq("project_id", projectId).order("period_start"),
  ]);
  const billIds = (bills ?? []).map((b) => b.id);
  const { data: raLines } = billIds.length
    ? await supabase.from("pmc_ra_lines").select("bill_id, description, unit, this_qty, rate_paise, sort_order").in("bill_id", billIds)
    : { data: [] as { bill_id: string; description: string; unit: string | null; this_qty: number; rate_paise: number; sort_order: number }[] };
  const billNoById = new Map((bills ?? []).map((b) => [b.id, b.bill_no as string]));
  const abstract = buildMeasurementAbstract(
    [...(raLines ?? [])]
      .sort((a, b) => Number(billNoById.get(a.bill_id)) - Number(billNoById.get(b.bill_id)) || a.sort_order - b.sort_order)
      .map((l) => ({ billNo: billNoById.get(l.bill_id) ?? "?", description: l.description, unit: l.unit, ratePaise: l.rate_paise, thisQty: l.this_qty })),
  );
  const subIds = (submissions ?? []).map((s) => s.id);
  const { data: messages } = subIds.length
    ? await supabase.from("submission_messages").select("id, contractor_submission_id, author_name, author_side, body, created_at").in("contractor_submission_id", subIds).order("created_at")
    : { data: [] as { id: string; contractor_submission_id: string; author_name: string; author_side: string; body: string; created_at: string }[] };

  // Latest issue of each drawing: the current revision of each root (fall back to the highest revision).
  const byRoot = new Map<string, NonNullable<typeof drawings>>();
  for (const d of drawings ?? []) {
    const key = d.root_id ?? d.id;
    byRoot.set(key, [...(byRoot.get(key) ?? []), d]);
  }
  const latest = [...byRoot.values()].map((revs) => revs.find((r) => r.is_current) ?? revs.sort((a, b) => b.rev_no - a.rev_no)[0]);
  const changeLog = (drawings ?? []).filter((d) => d.rev_no > 1 || d.revision_note);

  const claimed = (bills ?? []).reduce((n, b) => n + (b.gross_paise ?? 0), 0);
  const certifiedBills = (bills ?? []).filter((b) => CERTIFIED.has(b.status ?? ""));
  const net = (b: NonNullable<typeof bills>[number]) => (b.gross_paise ?? 0) + (b.gst_paise ?? 0) - (b.advance_recovery_paise ?? 0) - (b.retention_paise ?? 0) - (b.other_deduction_paise ?? 0) - (b.tds_paise ?? 0) - (b.cess_paise ?? 0) - (b.gst_tds_paise ?? 0);
  const certifiedGross = certifiedBills.reduce((n, b) => n + (b.gross_paise ?? 0), 0);
  const certifiedNet = certifiedBills.reduce((n, b) => n + net(b), 0);
  const retention = certifiedBills.reduce((n, b) => n + (b.retention_paise ?? 0), 0);
  const inReview = (bills ?? []).filter((b) => !CERTIFIED.has(b.status ?? "")).reduce((n, b) => n + (b.gross_paise ?? 0), 0);
  const originalValue = pkg?.contract_value_paise ?? null;
  // Variations visible to a contractor are the approved ones only (RLS); they revise the contract value.
  const variationTotal = (variations ?? []).reduce((n, v) => n + (v.amount_paise ?? 0), 0);
  const contractValue = originalValue != null ? originalValue + variationTotal : null;
  const received = (bills ?? []).reduce((n, b) => n + (b.paid_paise ?? 0), 0);
  const balance = contractValue != null ? Math.max(0, contractValue - claimed) : null;
  const pctBilled = contractValue ? Math.round((claimed / contractValue) * 100) : null;
  const progress = (milestones ?? []).length ? Math.round((milestones ?? []).reduce((n, m) => n + (m.percent_complete ?? 0), 0) / (milestones ?? []).length) : null;
  const openTickets = (submissions ?? []).filter((s) => s.status === "OPEN").length;
  const nextBillNo = String((bills ?? []).length + 1);

  const cpmSource = (milestones ?? []).filter((m) => m.duration_days != null);
  const cpmIds = new Set(cpmSource.map((m) => m.id));
  const cpmActivities: Activity[] = cpmSource.map((m) => ({
    id: m.id,
    durationDays: m.duration_days ?? 0,
    links: m.predecessor_id && cpmIds.has(m.predecessor_id) ? [{ predecessorId: m.predecessor_id, type: (m.dep_type ?? "FS") as "FS", lagDays: m.lag_days ?? 0 }] : [],
  }));
  const cpm = cpmActivities.length ? computeCpm(cpmActivities) : null;
  const cpmStart = (cpmSource.map((m) => m.planned_date).filter(Boolean).sort()[0] as string | undefined) ?? new Date().toISOString().slice(0, 10);
  const cpmRows = cpm ? cpm.activities.map((a) => ({ ...a, title: cpmSource.find((m) => m.id === a.id)?.title ?? "" })) : [];

  const finalAccount = computeFinalAccount(
    originalValue ?? 0,
    variationTotal,
    (bills ?? []).map((b) => ({
      status: b.status ?? "", grossPaise: b.gross_paise ?? 0, gstPaise: b.gst_paise ?? 0, retentionPaise: b.retention_paise ?? 0, tdsPaise: b.tds_paise ?? 0,
      cessPaise: b.cess_paise ?? 0, gstTdsPaise: b.gst_tds_paise ?? 0, advanceRecoveryPaise: b.advance_recovery_paise ?? 0, otherDeductionPaise: b.other_deduction_paise ?? 0, paidPaise: b.paid_paise ?? 0,
    })),
  );
  const steelIssued = (steel ?? []).reduce((n, c) => n + (c.issued_kg ?? 0), 0);
  const steelConsumed = (steel ?? []).reduce((n, c) => n + (c.consumed_kg ?? 0), 0);

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader eyebrow={project.project_ref} eyebrowMono title={project.project_title} result="The latest drawings, the programme and your bills in one place." />

        <div className="aorms-rail-kpis" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 9rem)", gap: "1rem", marginBottom: "2rem" }}>
          <KpiTile label="Contract value" value={inr(contractValue)} icon={CurrencyRupee} />
          <KpiTile label="Billed to date" value={inr(claimed)} icon={Receipt} href="#bills" />
          <KpiTile label="Certified (net)" value={inr(certifiedNet)} icon={CheckmarkOutline} href="#cost" />
          <KpiTile label="Progress" value={progress == null ? "—" : `${progress}%`} icon={ChartLine} href="#progress" />
          <KpiTile label="Open tickets" value={openTickets} icon={Chat} status={openTickets > 0 ? "NEEDS_INTERVENTION" : undefined} href="#tickets" />
        </div>

        <div className="aorms-cp__hero">
          <div className="aorms-pcard__media">
            {/* Static placeholder — plain <img>, not next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={placeholderFor(project.project_ref)} alt="" />
          </div>
        </div>

        <div className="aorms-cp">
          <div className="aorms-cp__main">
            <SheetGroup no={1} title="Drawings" note="The latest issue of every drawing, and what changed between issues">
              <SheetSub id="drawings">Latest drawings</SheetSub>
              <Table aria-label="Latest drawings" size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Ref</TableHeader>
                    <TableHeader>Title</TableHeader>
                    <TableHeader>Revision</TableHeader>
                    <TableHeader>Issued</TableHeader>
                    <TableHeader>File</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latest.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.ref}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>
                        <Tag type={d.rev_no > 1 ? "blue" : "gray"} size="sm">{`Rev ${d.rev_no}`}</Tag>
                      </TableCell>
                      <TableCell>{day(d.created_at)}</TableCell>
                      <TableCell>{d.storage_key ? <a href={`/api/contractor-file?t=drawing&id=${d.id}`}>Download</a> : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {latest.length === 0 && <SheetEmptyRow cols={5}>No drawings issued to you yet.</SheetEmptyRow>}
                </TableBody>
              </Table>

              <SheetSub id="changelog">Drawing change log</SheetSub>
              <Table aria-label="Drawing change log" size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Drawing</TableHeader>
                    <TableHeader>Rev</TableHeader>
                    <TableHeader>Issued</TableHeader>
                    <TableHeader>What changed</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {changeLog.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>{d.rev_no}</TableCell>
                      <TableCell>{day(d.created_at)}</TableCell>
                      <TableCell>{d.revision_note ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {changeLog.length === 0 && <SheetEmptyRow cols={4}>No revisions yet — every drawing is still at its first issue.</SheetEmptyRow>}
                </TableBody>
              </Table>
            </SheetGroup>

            <SheetGroup no={2} title="Progress schedule" note="Planned against actual, milestone by milestone">
              <SheetSub id="progress">Milestones</SheetSub>
              <Table aria-label="Milestones" size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Milestone</TableHeader>
                    <TableHeader>Planned</TableHeader>
                    <TableHeader>Actual</TableHeader>
                    <TableHeader>Complete</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(milestones ?? []).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.title}
                        {m.notes && <span className="cds--type-helper-text-01" style={{ display: "block", color: "var(--cds-text-secondary)" }}>{m.notes}</span>}
                      </TableCell>
                      <TableCell>{day(m.planned_date)}</TableCell>
                      <TableCell>{day(m.actual_date)}</TableCell>
                      <TableCell>
                        <span className="aorms-bar" role="img" aria-label={`${m.percent_complete ?? 0}% complete`}>
                          <span style={{ inlineSize: `${m.percent_complete ?? 0}%` }} />
                        </span>
                        <span className="cds--type-helper-text-01"> {m.percent_complete ?? 0}%</span>
                      </TableCell>
                      <TableCell>
                        <Tag type={MS_TAG[m.status ?? "PLANNED"] ?? "gray"} size="sm">{(m.status ?? "PLANNED").replaceAll("_", " ")}</Tag>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(milestones ?? []).length === 0 && <SheetEmptyRow cols={5}>The studio hasn&apos;t published a programme for this project yet.</SheetEmptyRow>}
                </TableBody>
              </Table>
              <SheetSub id="cpm">Critical path</SheetSub>
              {cpmRows.length === 0 ? (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                  The studio has not set durations and dependencies on the programme yet, so no critical path is available.
                </p>
              ) : (
                <>
                  <p className="cds--type-helper-text-01" style={{ marginBottom: "0.5rem", color: "var(--cds-text-secondary)" }}>
                    Computed from milestone durations and links (forward and backward pass). Project length {cpm!.projectDurationDays} days{cpm!.hasCycle ? " — a dependency loop was found and ignored" : ""}.
                  </p>
                  <Table aria-label="Critical path" size="sm" className="aorms-table-spaced">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Milestone</TableHeader>
                        <TableHeader>Schedule</TableHeader>
                        <TableHeader>Start</TableHeader>
                        <TableHeader>Finish</TableHeader>
                        <TableHeader className="aorms-num">Float (days)</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cpmRows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>{r.title} {r.isCritical && <Tag type="red" size="sm">Critical</Tag>}</TableCell>
                          <TableCell>
                            <span className="aorms-gantt" role="img" aria-label={`Day ${r.earlyStart} to ${r.earlyFinish}`}>
                              <span style={{ insetInlineStart: `${(r.earlyStart / Math.max(1, cpm!.projectDurationDays)) * 100}%`, inlineSize: `${Math.max(1.5, ((r.earlyFinish - r.earlyStart) / Math.max(1, cpm!.projectDurationDays)) * 100)}%` }} data-critical={r.isCritical ? "1" : undefined} />
                            </span>
                          </TableCell>
                          <TableCell>{day(dateForOffset(cpmStart, r.earlyStart))}</TableCell>
                          <TableCell>{day(dateForOffset(cpmStart, r.earlyFinish))}</TableCell>
                          <TableCell className="aorms-num">{r.totalFloat}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              <SheetSub>Report progress</SheetSub>
              <p className="cds--type-helper-text-01" style={{ marginBottom: "0.75rem", color: "var(--cds-text-secondary)" }}>
                The programme is kept by the studio. Send a progress update and they will update the milestones.
              </p>
              <ContractorRaiseForm projectId={projectId} defaultKind="PROGRESS_UPDATE" milestones={(milestones ?? []).map((m) => ({ id: m.id, ref: m.ref, title: m.title }))} />
            </SheetGroup>

            <SheetGroup no={3} title="Running bills and cost" note="Submit your bills and see where the contract stands">
              <SheetSub id="bills">Running bills</SheetSub>
              <Table aria-label="Running bills" size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Bill</TableHeader>
                    <TableHeader>Period</TableHeader>
                    <TableHeader className="aorms-num">Gross</TableHeader>
                    <TableHeader className="aorms-num">Net</TableHeader>
                    <TableHeader>Status</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(bills ?? []).map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{`${b.ref} · No. ${b.bill_no}`}{b.attachment_key && <> · <a href={`/api/contractor-file?t=bill&id=${b.id}`}>Backup</a></>}</TableCell>
                      <TableCell>{`${day(b.period_start)} – ${day(b.period_end)}`}</TableCell>
                      <TableCell className="aorms-num">{inr(b.gross_paise)}</TableCell>
                      <TableCell className="aorms-num">{CERTIFIED.has(b.status ?? "") ? inr(net(b)) : "—"}</TableCell>
                      <TableCell>
                        <Tag type={CERTIFIED.has(b.status ?? "") ? "green" : "gray"} size="sm">{BILL_LABEL[b.status ?? ""] ?? b.status}</Tag>
                        {(b.paid_paise ?? 0) > 0 && <span className="cds--type-helper-text-01"> · paid {inr(b.paid_paise)}{b.paid_at ? ` on ${day(b.paid_at)}` : ""}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(bills ?? []).length === 0 && <SheetEmptyRow cols={5}>No bills submitted yet.</SheetEmptyRow>}
                </TableBody>
              </Table>
              {pkg?.package_id && pkg.package_status !== "COMPLETE" ? (
                <>
                  <SheetSub>Submit a running bill</SheetSub>
                  <ContractorRaBillForm projectId={projectId} packageId={pkg.package_id} nextBillNo={nextBillNo} />
                </>
              ) : (
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {pkg ? "This package is complete — no further bills can be submitted." : "You don't hold a package on this project, so there is nothing to bill."}
                </p>
              )}

              <SheetSub id="cost">Cost tracking</SheetSub>
              <Table aria-label="Cost tracking" size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Item</TableHeader>
                    <TableHeader className="aorms-num">Amount</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    [
                      ["Original contract value", inr(originalValue)],
                      ["Approved variations", inr(variationTotal)],
                      ["Revised contract value", inr(contractValue)],
                      ["Claimed to date (all bills, gross)", inr(claimed)],
                      ["Still in review (not yet certified)", inr(inReview)],
                      ["Certified (gross)", inr(certifiedGross)],
                      ["Certified (net of advance, retention, deductions)", inr(certifiedNet)],
                      ["Retention held", inr(retention)],
                      ["Received to date", inr(received)],
                      ["Certified, awaiting payment", inr(Math.max(0, certifiedNet - received))],
                      ["Balance to bill", inr(balance)],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell className="aorms-num">{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {(variations ?? []).length > 0 && (
                <>
                  <SheetSub>Approved variations</SheetSub>
                  <Table aria-label="Approved variations" size="sm" className="aorms-table-spaced">
                    <TableHead>
                      <TableRow>
                        <TableHeader>Ref</TableHeader>
                        <TableHeader>Variation</TableHeader>
                        <TableHeader className="aorms-num">Amount</TableHeader>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(variations ?? []).map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.ref}</TableCell>
                          <TableCell>{v.title}</TableCell>
                          <TableCell className="aorms-num">{inr(v.amount_paise)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
              {pctBilled != null && (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {pctBilled}% of the contract value has been claimed{progress != null ? `, against ${progress}% programme progress` : ""}.
                </p>
              )}
              <SheetSub id="abstract">Measurement abstract (to date)</SheetSub>
              {abstract.rows.length === 0 ? (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Bills submitted with measurement lines build a running abstract here: quantity per item for each bill and to date.
                </p>
              ) : (
                <Table aria-label="Measurement abstract" size="sm" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Item</TableHeader>
                      <TableHeader>Unit</TableHeader>
                      <TableHeader className="aorms-num">Rate</TableHeader>
                      {abstract.billNos.map((n) => <TableHeader key={n} className="aorms-num">{`Bill ${n}`}</TableHeader>)}
                      <TableHeader className="aorms-num">To date</TableHeader>
                      <TableHeader className="aorms-num">Amount</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {abstract.rows.map((r) => (
                      <TableRow key={`${r.description}|${r.unit}|${r.ratePaise}`}>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>{r.unit || "—"}</TableCell>
                        <TableCell className="aorms-num">{inr(r.ratePaise)}</TableCell>
                        {abstract.billNos.map((n) => <TableCell key={n} className="aorms-num">{r.billQty[n] ?? "—"}</TableCell>)}
                        <TableCell className="aorms-num">{r.toDateQty}</TableCell>
                        <TableCell className="aorms-num">{inr(r.toDateAmountPaise)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <SheetSub id="steel">Steel reconciliation</SheetSub>
              {(steel ?? []).length === 0 ? (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>No certified steel reconciliation for this project yet.</p>
              ) : (
                <Table aria-label="Steel reconciliation" size="sm" className="aorms-table-spaced">
                  <TableHead>
                    <TableRow>
                      <TableHeader>Period</TableHeader>
                      <TableHeader className="aorms-num">Issued (kg)</TableHeader>
                      <TableHeader className="aorms-num">Consumed (kg)</TableHeader>
                      <TableHeader className="aorms-num">Wastage</TableHeader>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(steel ?? []).map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{`${day(c.period_start)} – ${day(c.period_end)}`}{c.narrative ? ` · ${c.narrative}` : ""}</TableCell>
                        <TableCell className="aorms-num">{c.issued_kg.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="aorms-num">{c.consumed_kg.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="aorms-num">{c.wastage_pct}%</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell className="aorms-num"><strong>{steelIssued.toLocaleString("en-IN")}</strong></TableCell>
                      <TableCell className="aorms-num"><strong>{steelConsumed.toLocaleString("en-IN")}</strong></TableCell>
                      <TableCell className="aorms-num"><strong>{steelIssued > 0 ? `${(((steelIssued - steelConsumed) / steelIssued) * 100).toFixed(2)}%` : "—"}</strong></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              <SheetSub id="final-account">{finalAccount.projected ? "Final account (projected)" : "Final account"}</SheetSub>
              <Table aria-label="Final account" size="sm" className="aorms-table-spaced">
                <TableHead>
                  <TableRow>
                    <TableHeader>Item</TableHeader>
                    <TableHeader className="aorms-num">Amount</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    [
                      ["Original contract value", inr(finalAccount.originalPaise)],
                      ["+ Approved variations", inr(finalAccount.variationsPaise)],
                      ["Final contract value", inr(finalAccount.finalValuePaise)],
                      ["Certified work (gross)", inr(finalAccount.certifiedGrossPaise)],
                      ["Submitted, not yet certified", inr(finalAccount.uncertifiedPaise)],
                      ["Not yet billed", inr(finalAccount.unbilledPaise)],
                      ["Net certified (after GST and deductions)", inr(finalAccount.netCertifiedPaise)],
                      ["+ Retention to be released on completion", inr(finalAccount.retentionHeldPaise)],
                      ["− Received to date", inr(finalAccount.receivedPaise)],
                      ["Balance due to you on completion", inr(finalAccount.balanceDuePaise)],
                    ] as [string, string][]
                  ).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell>{k}</TableCell>
                      <TableCell className="aorms-num">{v}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {finalAccount.projected && (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Projected: some work is still to be billed or certified, so these figures will move.
                </p>
              )}
            </SheetGroup>

            <SheetGroup no={4} title="Tickets, meetings and messages" note="Raise an issue, ask for a meeting, reply to the studio">
              <SheetSub id="tickets">Raise something</SheetSub>
              <ContractorRaiseForm projectId={projectId} milestones={(milestones ?? []).map((m) => ({ id: m.id, ref: m.ref, title: m.title }))} />
              <SheetSub>Your threads</SheetSub>
              {(submissions ?? []).length === 0 && <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>Nothing raised yet.</p>}
              {(submissions ?? []).map((s) => {
                const thread = (messages ?? []).filter((m) => m.contractor_submission_id === s.id);
                return (
                  <div key={s.id} className="aorms-thread">
                    <div className="aorms-thread__head">
                      <Tag type="cool-gray" size="sm">{KIND_LABEL[s.kind] ?? s.kind}</Tag>
                      <Tag type={SUB_TAG[s.status ?? "OPEN"] ?? "gray"} size="sm">{s.status}</Tag>
                      <strong>{s.subject}</strong>
                      <span className="cds--type-helper-text-01">{day(s.created_at)}</span>
                    </div>
                    {s.body && <p className="cds--type-body-01" style={{ whiteSpace: "pre-wrap" }}>{s.body}</p>}
                    {s.meeting_at && (
                      <p className="aorms-thread__reply">
                        <strong>Meeting confirmed:</strong> {new Date(s.meeting_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}{s.meeting_place ? ` · ${s.meeting_place}` : ""} · <a href={`/api/contractor-file/ics?id=${s.id}`}>Add to calendar</a>
                      </p>
                    )}
                    {s.kind === "PROGRESS_UPDATE" && s.percent_complete != null && (
                      <p className="cds--type-helper-text-01">{s.percent_complete}% reported · {s.applied_at ? "applied to the programme" : "awaiting the studio"}</p>
                    )}
                    {s.storage_key && <p className="cds--type-helper-text-01"><a href={`/api/contractor-file?t=submission&id=${s.id}`}>{s.file_name ?? "Attachment"}</a></p>}
                    {s.response_note && (
                      <p className="aorms-thread__reply">
                        <strong>Studio:</strong> {s.response_note}
                      </p>
                    )}
                    {thread.map((m) => (
                      <p key={m.id} className="aorms-thread__msg">
                        <strong>{m.author_side === "CONTRACTOR" ? "You" : m.author_name}</strong>
                        <span className="cds--type-helper-text-01"> · {day(m.created_at)}</span>
                        <br />
                        {m.body}
                      </p>
                    ))}
                    {s.status !== "RESOLVED" && <ContractorMessageForm submissionId={s.id} projectId={projectId} />}
                  </div>
                );
              })}
            </SheetGroup>
          </div>

          <aside className="aorms-cp__aside" aria-label="Project summary">
            <SheetPane title="Your package">
              {pkg ? (
                <SheetFacts
                  facts={[
                    ["Package", pkg.package_title ?? "—"],
                    ["Trade", pkg.trade ?? "—"],
                    ["Value", inr(pkg.contract_value_paise)],
                    ["Status", (pkg.package_status ?? "—").replaceAll("_", " ")],
                  ]}
                />
              ) : (
                <p className="aorms-cp__pane-empty">No package on this project.</p>
              )}
            </SheetPane>
            <SheetPane title="Project">
              <SheetFacts facts={[["Status", project.project_status.replaceAll("_", " ")], ["Location", project.city ?? "—"]]} />
            </SheetPane>
          </aside>
        </div>
      </Column>
    </Grid>
  );
}
