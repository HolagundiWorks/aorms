import { Tile } from "@carbon/react";

/**
 * The 3-state health read some KPIs support (2026-09-13) — deliberately
 * NOT every KPI: a status only makes sense where "more" has a real bad
 * direction (absences, an aging outstanding balance, a request pile-up).
 * A pure headline count like Clients/Projects/Proposals/Total billed has
 * no such direction (more is never bad), so those stay plain, unstatused
 * numbers — see dashboard/page.tsx's own per-metric threshold comments
 * for where each status actually comes from.
 */
export type KpiStatus = "NORMAL" | "NEEDS_INTERVENTION" | "CRITICAL";

const STATUS_LABEL: Record<KpiStatus, string> = {
  NORMAL: "Normal",
  NEEDS_INTERVENTION: "Needs intervention",
  CRITICAL: "Critical",
};

// Carbon's own semantic support tokens (success/warning/error), not the
// generic Tag color palette — Tag has no "yellow"/amber option at all
// (its TYPES are red/magenta/purple/blue/cyan/teal/green/gray only), and
// these are the tokens Carbon itself reserves for exactly this 3-state
// status meaning app-wide (e.g. this app's own "Low confidence" %,
// pulse's confidence score), not a decorative label color.
const STATUS_COLOR: Record<KpiStatus, string> = {
  NORMAL: "var(--cds-support-success)",
  NEEDS_INTERVENTION: "var(--cds-support-warning)",
  CRITICAL: "var(--cds-support-error)",
};

/**
 * Shared KPI stat tile — the "4 KPI cards" pattern this repo's own module
 * map already calls out for dashboard-style screens (`StudioAbstract.tsx`
 * on the old frontend). Extracted from `dashboard/page.tsx`'s own local
 * `Kpi` function (2026-09-04) so a second screen (`/projects/[id]/decisions`)
 * doesn't grow a second, silently-drifting copy of the same ten lines.
 *
 * Number-first, label-below — matches the ERP typography guide's own KPI
 * pattern exactly (§20/21): number at `heading-05` (32px/40px) + the
 * `semibold` weight class (heading-05 is 400 by default in the real
 * Carbon v11 scale — see globals.scss's own header comment on the
 * `type.type-classes` fix this depended on), label below at `body-01`
 * (14px/400), not a `label-01` caption above it as this used to read.
 *
 * `status` is optional and additive — every existing call site (44 pages)
 * renders identically without it; only the dashboard's own health-bearing
 * metrics pass one.
 */
export function KpiTile({ label, value, status }: { label: string; value: string | number; status?: KpiStatus }) {
  return (
    <Tile style={{ minHeight: "6.5rem", position: "relative" }}>
      {status && (
        <span
          aria-hidden
          title={STATUS_LABEL[status]}
          style={{
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            width: "0.5rem",
            height: "0.5rem",
            borderRadius: "50%",
            background: STATUS_COLOR[status],
          }}
        />
      )}
      <p className="cds--type-heading-05 cds--type-semibold">{value}</p>
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
        {label}
      </p>
      {status && (
        <p className="cds--type-helper-text-01" style={{ color: STATUS_COLOR[status], marginTop: "0.25rem" }}>
          {STATUS_LABEL[status]}
        </p>
      )}
    </Tile>
  );
}
