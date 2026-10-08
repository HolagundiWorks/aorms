import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { CurrencyRupee, Receipt, CheckmarkOutline, ChartLine, Chat } from "@carbon/icons-react";
import { createClient } from "../../../../../lib/supabase/server";
import { placeholderFor } from "../../../../../lib/projects/placeholder";
import { PageHeader } from "../../../../../components/aorms/PageHeader";
import { KpiTile } from "../../../../../components/aorms/KpiTile";
import { SheetEmptyRow, SheetFacts, SheetGroup, SheetPane, SheetSub } from "../../../../../components/aorms/PortalSheet";
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

  const [{ data: drawings }, { data: milestones }, { data: bills }, { data: submissions }] = await Promise.all([
    supabase.from("drawings").select("id, ref, title, rev_no, root_id, is_current, revision_note, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("pmc_milestones").select("id, ref, title, planned_date, actual_date, percent_complete, status, notes").eq("project_id", projectId).order("sort_order"),
    supabase.from("pmc_ra_bills").select("id, ref, bill_no, period_start, period_end, status, gross_paise, advance_recovery_paise, retention_paise, other_deduction_paise, narrative").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("contractor_submissions").select("id, kind, subject, body, status, response_note, created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);
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
  const net = (b: NonNullable<typeof bills>[number]) => (b.gross_paise ?? 0) - (b.advance_recovery_paise ?? 0) - (b.retention_paise ?? 0) - (b.other_deduction_paise ?? 0);
  const certifiedGross = certifiedBills.reduce((n, b) => n + (b.gross_paise ?? 0), 0);
  const certifiedNet = certifiedBills.reduce((n, b) => n + net(b), 0);
  const retention = certifiedBills.reduce((n, b) => n + (b.retention_paise ?? 0), 0);
  const inReview = (bills ?? []).filter((b) => !CERTIFIED.has(b.status ?? "")).reduce((n, b) => n + (b.gross_paise ?? 0), 0);
  const contractValue = pkg?.contract_value_paise ?? null;
  const balance = contractValue != null ? Math.max(0, contractValue - claimed) : null;
  const pctBilled = contractValue ? Math.round((claimed / contractValue) * 100) : null;
  const progress = (milestones ?? []).length ? Math.round((milestones ?? []).reduce((n, m) => n + (m.percent_complete ?? 0), 0) / (milestones ?? []).length) : null;
  const openTickets = (submissions ?? []).filter((s) => s.status === "OPEN").length;
  const nextBillNo = String((bills ?? []).length + 1);

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
                    </TableRow>
                  ))}
                  {latest.length === 0 && <SheetEmptyRow cols={4}>No drawings issued to you yet.</SheetEmptyRow>}
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
              <SheetSub>Report progress</SheetSub>
              <p className="cds--type-helper-text-01" style={{ marginBottom: "0.75rem", color: "var(--cds-text-secondary)" }}>
                The programme is kept by the studio. Send a progress update and they will update the milestones.
              </p>
              <ContractorRaiseForm projectId={projectId} defaultKind="PROGRESS_UPDATE" />
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
                      <TableCell>{`${b.ref} · No. ${b.bill_no}`}</TableCell>
                      <TableCell>{`${day(b.period_start)} – ${day(b.period_end)}`}</TableCell>
                      <TableCell className="aorms-num">{inr(b.gross_paise)}</TableCell>
                      <TableCell className="aorms-num">{CERTIFIED.has(b.status ?? "") ? inr(net(b)) : "—"}</TableCell>
                      <TableCell>
                        <Tag type={CERTIFIED.has(b.status ?? "") ? "green" : "gray"} size="sm">{BILL_LABEL[b.status ?? ""] ?? b.status}</Tag>
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
                      ["Contract value", inr(contractValue)],
                      ["Claimed to date (all bills, gross)", inr(claimed)],
                      ["Still in review (not yet certified)", inr(inReview)],
                      ["Certified (gross)", inr(certifiedGross)],
                      ["Certified (net of advance, retention, deductions)", inr(certifiedNet)],
                      ["Retention held", inr(retention)],
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
              {pctBilled != null && (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {pctBilled}% of the contract value has been claimed{progress != null ? `, against ${progress}% programme progress` : ""}.
                </p>
              )}
            </SheetGroup>

            <SheetGroup no={4} title="Tickets, meetings and messages" note="Raise an issue, ask for a meeting, reply to the studio">
              <SheetSub id="tickets">Raise something</SheetSub>
              <ContractorRaiseForm projectId={projectId} />
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
