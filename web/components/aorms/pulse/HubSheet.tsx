import Link from "next/link";
import { getHubData } from "../../../lib/pulse/hub-data";

/**
 * 00 / THE OFFICE — the Hub as an architect's working sheet rather than a KPI
 * grid (HCWorks title-sheet direction, 2026-09-30). Three ruled columns that
 * answer "what is happening?": PROJECTS (by lifecycle status), TODAY (what
 * falls due today) and ATTENTION (the specific items that need someone).
 * Every figure is a real count from the firm's own records via the caller's
 * RLS-scoped session; nothing is estimated. Each attention row links to the
 * exact filtered view that resolves it (e.g. /tasks?date=overdue&project=…).
 */
const STATUS_ORDER: [string, string][] = [
  ["ACTIVE", "Active"],
  ["PROPOSAL", "Proposal"],
  ["ENQUIRY", "Enquiry"],
  ["ON_HOLD", "On hold"],
  ["COMPLETED", "Completed"],
];

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

type Attention = { key: string; ref: string; text: string; reason: string; href: string };

export async function HubSheet() {
  const { dateLabel, today, projectRows, refOf, byStatus, dueToday, overdue, blocked, meetings: meetingRows, decisions: decisionRows, approvalsSent, openSnags } =
    await getHubData();

  const byPriority = (a: { priority: string }, b: { priority: string }) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
  const attention: Attention[] = [
    ...[...overdue].sort(byPriority).slice(0, 3).map((t) => ({
      key: `o-${t.id}`,
      ref: (t.project_id && refOf.get(t.project_id)) || "—",
      text: t.title,
      reason: "Overdue",
      href: `/tasks?date=overdue${t.project_id ? `&project=${t.project_id}` : ""}`,
    })),
    ...blocked.slice(0, 2).map((t) => ({
      key: `b-${t.id}`,
      ref: (t.project_id && refOf.get(t.project_id)) || "—",
      text: t.title,
      reason: "Blocked",
      href: `/tasks${t.project_id ? `?project=${t.project_id}` : ""}`,
    })),
    ...decisionRows.slice(0, 2).map((d) => ({
      key: `d-${d.id}`,
      ref: refOf.get(d.project_id) ?? "—",
      text: d.title,
      reason: "Client decision required",
      href: `/projects/${d.project_id}/decisions`,
    })),
  ].slice(0, 6);

  const todayRows: [string, number, string?][] = [
    ["Meetings", meetingRows.length, "/moms"],
    ["Tasks due", dueToday, "/tasks?date=today"],
    ["Overdue", overdue.length, "/tasks?date=overdue"],
    ["Decisions with client", decisionRows.length],
    ["Approvals awaiting", approvalsSent, "/approvals"],
    ["Open snags", openSnags, "/snags"],
  ];

  return (
    <section className="aorms-hub" aria-label="The office today">
      <header className="aorms-hub__head">
        <span className="aorms-sheet-mark" style={{ border: 0, padding: 0, margin: 0 }}>00 / The office</span>
        <h2 className="cds--type-heading-04" style={{ fontWeight: 300 }}>What is happening?</h2>
      </header>

      <div className="aorms-hub__cols">
        <div className="aorms-hub__col">
          <h3 className="aorms-bigstat__label">Projects</h3>
          <dl className="aorms-hub__list">
            {STATUS_ORDER.filter(([k]) => byStatus.get(k)).map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd className={k === "ACTIVE" ? "aorms-hub__active" : undefined}>{String(byStatus.get(k)).padStart(2, "0")}</dd>
              </div>
            ))}
            {projectRows.length === 0 && (
              <div>
                <dt>No projects yet</dt>
                <dd>—</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="aorms-hub__col">
          <h3 className="aorms-bigstat__label">Today · {dateLabel}</h3>
          <dl className="aorms-hub__list">
            {todayRows.map(([label, n, href]) => (
              <div key={label}>
                <dt>{href && n > 0 ? <Link href={href}>{label}</Link> : label}</dt>
                <dd>{String(n).padStart(2, "0")}</dd>
              </div>
            ))}
          </dl>
          {meetingRows.length > 0 && (
            <ul className="aorms-hub__meetings">
              {meetingRows.slice(0, 3).map((m) => (
                <li key={m.id}>
                  <span className="aorms-hub__ref">{refOf.get(m.project_id) ?? "—"}</span> {m.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="aorms-hub__col">
          <h3 className="aorms-bigstat__label">Attention</h3>
          {attention.length === 0 ? (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>Nothing needs attention right now.</p>
          ) : (
            <ul className="aorms-hub__attention">
              {attention.map((a) => (
                <li key={a.key}>
                  <Link href={a.href}>
                    <span className="aorms-hub__ref">{a.ref}</span>
                    <span>
                      {a.text}
                      <em>{a.reason}</em>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
