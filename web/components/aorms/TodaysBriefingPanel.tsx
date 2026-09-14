import { CheckmarkFilled, Money, Renew, UserMultiple, WarningAltFilled } from "@carbon/icons-react";
import { AnimatedNumber } from "./AnimatedNumber";
import { KPI_SEVERITY } from "../../lib/kpi-severity";

/**
 * Visual for Pulse — the hero section (spec §5) and the dedicated Pulse
 * showcase section (spec §8) both render this same component. A 5-stat
 * grid matching the developer spec's own worked example exactly
 * (₹8,42,500 ready to bill / 7 client approvals / 3 projects at risk /
 * 12 open revisions / 4 team members unavailable), styled after the
 * real product's own KpiTile pattern (icon + big number + label, a
 * colored top stripe) — icon + big number + label — rather than the
 * bullet-line "brief" shape this component used before the 2026-09-14
 * landing rebuild. Illustrative figures only, same posture as every
 * other feature panel on this page: not a real studio's numbers.
 *
 * Stripe colors (2026-09-14 same-day follow-up: "update the alert
 * colours in kpi tiles in hero section and pulse section") — these were
 * five different `--cds-support-*`/`text-secondary` colors read as five
 * different *kinds* of tile, the exact anti-pattern the KPI anatomy
 * diagram's own color key (`KpiAnatomyDiagram.tsx`) argues against. Now
 * the same shared `KPI_SEVERITY` 4-color scale (`lib/kpi-severity.ts`)
 * that diagram explains: green (good progress — money already earned),
 * yellow (needs attention — waiting on someone else), orange (needs
 * attention, more urgent — sitting unbilled), red (alert — at risk).
 */
const STATS = [
  { icon: Money, value: 842500, kind: "inr" as const, label: "Ready to bill", stripe: KPI_SEVERITY.green },
  { icon: CheckmarkFilled, value: 7, kind: "plain" as const, label: "Client approvals", stripe: KPI_SEVERITY.yellow },
  { icon: WarningAltFilled, value: 3, kind: "plain" as const, label: "Projects at risk", stripe: KPI_SEVERITY.red },
  { icon: Renew, value: 12, kind: "plain" as const, label: "Open revisions", stripe: KPI_SEVERITY.orange },
  { icon: UserMultiple, value: 4, kind: "plain" as const, label: "Team unavailable", stripe: KPI_SEVERITY.yellow },
] as const;

export function TodaysBriefingPanel() {
  return (
    <div style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }} aria-hidden>
      <div style={{ padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Pulse
        </p>
        <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem" }}>
          Good morning. Here&apos;s the practice today.
        </p>
      </div>

      {/* flex-wrap, not a 2-column CSS grid — 5 items in a 2-column
          `repeat(auto-fit, ...)` grid leaves a visible empty phantom
          cell in the last row on narrow viewports (found live, 2026-09-14
          composition review). Flexbox wraps the same way without ever
          creating that dead cell, since there's no implicit grid track
          to leave unfilled. */}
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              style={{
                flex: "1 1 9rem",
                background: "var(--cds-layer)",
                padding: "1rem",
                borderTop: `3px solid ${stat.stripe}`,
                borderRight: "1px solid var(--cds-border-subtle)",
                borderBottom: "1px solid var(--cds-border-subtle)",
              }}
            >
              <Icon size={18} style={{ color: "var(--cds-icon-secondary)" }} />
              <p className="cds--type-heading-04" style={{ marginTop: "0.5rem" }}>
                <AnimatedNumber value={stat.value} kind={stat.kind} />
              </p>
              <p className="cds--type-label-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
