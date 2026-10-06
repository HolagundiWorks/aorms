import { ErrorFilled, WarningAltFilled } from "@carbon/icons-react";
import { BigStat } from "./BigStat";
import { KpiTile } from "./KpiTile";

/**
 * Landing visual for Pulse — rebuilt (2026-10-05; numbers count up when scrolled into view, 2026-10-06) from the portal's own components so it matches what a
 * signed-in practice actually sees: the left rail of large numerals (BigStat, two-up), the "ready to bill"
 * figure, the written brief, and the Pulse tab's KPI tiles (KpiTile — severity stripe, icon, movement vs
 * yesterday). Figures mirror the read-only demo practice's Pulse on the day this was captured; they are
 * sample data, not a real studio's numbers. `aria-hidden`: decorative, the same facts are in the page copy.
 */
const RAIL = [
  { value: 18, label: "Projects" },
  { value: 58, label: "Open tasks", active: true },
  { value: 4, label: "Critical" },
  { value: 2, label: "Blocked" },
] as const;

export function TodaysBriefingPanel() {
  return (
    <div style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }} aria-hidden>
      <div style={{ padding: "1rem 1.25rem 0.5rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Pulse
        </p>
        <p className="cds--type-productive-heading-02" style={{ marginBlockStart: "0.25rem" }}>
          Good morning. Here&apos;s the practice today.
        </p>
      </div>

      <div style={{ padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "0.75rem 1rem" }}>
        {RAIL.map((s) => (
          <BigStat key={s.label} value={s.value} label={s.label} active={"active" in s ? s.active : undefined} animate="plain" />
        ))}
        <div style={{ gridColumn: "1 / -1" }}>
          <BigStat value={714800} label="Ready to bill" animate="inr" />
        </div>
      </div>

      <p className="cds--type-body-01" style={{ padding: "0 1.25rem 1rem", color: "var(--cds-text-secondary)" }}>
        14 tasks overdue, 2 due today, 2 decisions waiting on the client, 3 tasks blocked and 1 open snag.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", padding: "0 1.25rem 1.25rem" }}>
        <KpiTile animate label="Critical" value={4} status="CRITICAL" icon={ErrorFilled} trend={{ direction: "up", value: "1", label: "vs yesterday", impact: "negative" }} />
        <KpiTile animate label="Projects at risk" value={6} status="CRITICAL" icon={WarningAltFilled} />
      </div>
    </div>
  );
}
