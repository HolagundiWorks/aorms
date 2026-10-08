import { Column, Grid, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { BigStat } from "../../../components/aorms/BigStat";
import { ApplyProgressButton, StudioMessageForm, TicketRespondForm } from "../../../components/aorms/ContractorTicketForms";

const KIND_LABEL: Record<string, string> = { TICKET: "Ticket", MEETING_REQUEST: "Meeting", RFI: "RFI", PROGRESS_UPDATE: "Progress", NOTE: "Note", SITE_VISIT: "Site visit", JOINT_MEASUREMENT: "Joint measurement" };
const SUB_TAG: Record<string, "red" | "blue" | "green" | "gray"> = { OPEN: "red", RESPONDED: "blue", RESOLVED: "green" };
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");

/**
 * Contractor inbox (2026-10-08) — what contractors raise from the Contractor Portal: tickets, meeting requests, RFIs,
 * progress updates and notes, with the thread and the studio's reply. Running bills they submit land in
 * Site → RA Bills (as drafts, tagged as contractor-submitted).
 */
export default async function ContractorTicketsPage() {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("contractor_submissions")
    .select("id, kind, subject, body, status, response_note, created_at, meeting_at, meeting_place, storage_key, file_name, milestone_id, percent_complete, applied_at, contractors(name), project_offices(ref, title)")
    .order("created_at", { ascending: false });
  const ids = (items ?? []).map((i) => i.id);
  const { data: messages } = ids.length
    ? await supabase.from("submission_messages").select("id, contractor_submission_id, author_name, author_side, body, created_at").in("contractor_submission_id", ids).order("created_at")
    : { data: [] as { id: string; contractor_submission_id: string; author_name: string; author_side: string; body: string; created_at: string }[] };

  const rows = items ?? [];
  const open = rows.filter((r) => r.status === "OPEN").length;
  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Contractor tickets" result="Every contractor request answered." description="Tickets, meeting requests, RFIs and progress updates raised from the Contractor Portal." />
        <div className="aorms-bigstat-row">
          <BigStat value={rows.length} label="Items" />
          <BigStat value={open} label="Open" active />
          <BigStat value={rows.filter((r) => r.kind === "MEETING_REQUEST" && r.status === "OPEN").length} label="Meetings to schedule" />
        </div>
        {error && <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>Couldn&apos;t load the inbox: {error.message}</p>}
        {rows.length === 0 && !error && <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>Nothing raised by contractors yet.</p>}
        {rows.map((r) => {
          const contractor = one(r.contractors as { name: string } | { name: string }[] | null);
          const project = one(r.project_offices as { ref: string; title: string } | { ref: string; title: string }[] | null);
          const thread = (messages ?? []).filter((m) => m.contractor_submission_id === r.id);
          return (
            <div key={r.id} className="aorms-thread">
              <div className="aorms-thread__head">
                <Tag type="cool-gray" size="sm">{KIND_LABEL[r.kind] ?? r.kind}</Tag>
                <Tag type={SUB_TAG[r.status ?? "OPEN"] ?? "gray"} size="sm">{r.status}</Tag>
                <strong>{r.subject}</strong>
                <span className="cds--type-helper-text-01">{[contractor?.name, project ? `${project.title} (${project.ref})` : null, day(r.created_at)].filter(Boolean).join(" · ")}</span>
              </div>
              {r.body && <p className="cds--type-body-01" style={{ whiteSpace: "pre-wrap" }}>{r.body}</p>}
              {r.meeting_at && (
                <p className="aorms-thread__reply">
                  <strong>Meeting confirmed:</strong> {new Date(r.meeting_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST{r.meeting_place ? ` · ${r.meeting_place}` : ""} · <a href={`/api/contractor-file/ics?id=${r.id}`}>Calendar file</a>
                </p>
              )}
              {r.storage_key && <p className="cds--type-helper-text-01"><a href={`/api/contractor-file?t=submission&id=${r.id}`}>{r.file_name ?? "Attachment"}</a></p>}
              {r.kind === "PROGRESS_UPDATE" && r.percent_complete != null && (
                <>
                  <p className="cds--type-helper-text-01">Reports {r.percent_complete}% complete · {r.applied_at ? "applied to the programme" : "not yet applied"}</p>
                  {!r.applied_at && r.milestone_id && <ApplyProgressButton id={r.id} />}
                </>
              )}
              {thread.map((m) => (
                <p key={m.id} className="aorms-thread__msg">
                  <strong>{m.author_side === "FIRM" ? "Studio" : m.author_name}</strong>
                  <span className="cds--type-helper-text-01"> · {day(m.created_at)}</span>
                  <br />
                  {m.body}
                </p>
              ))}
              <TicketRespondForm id={r.id} status={r.status ?? "OPEN"} note={r.response_note} canSchedule={["MEETING_REQUEST", "SITE_VISIT", "JOINT_MEASUREMENT"].includes(r.kind)} />
              <StudioMessageForm submissionId={r.id} />
            </div>
          );
        })}
      </Column>
    </Grid>
  );
}
