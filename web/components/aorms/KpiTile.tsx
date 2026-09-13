import type { ComponentType } from "react";
import Link from "next/link";
import { Tile } from "@carbon/react";
import { ArrowUp, ArrowDown, ArrowRight } from "@carbon/icons-react";

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
// pulse's confidence score), not a decorative label color. Maps onto the
// shell/identity/KPI spec's own 5-token model (neutral/info/positive/
// warning/critical) as NORMAL→positive, NEEDS_INTERVENTION→warning,
// CRITICAL→critical; "neutral"/"info" aren't separate tokens here
// because they're just "no status passed at all" (below) — this app has
// no KPI that's informational-but-not-actionable in a way "no stripe"
// doesn't already say.
const STATUS_COLOR: Record<KpiStatus, string> = {
  NORMAL: "var(--cds-support-success)",
  NEEDS_INTERVENTION: "var(--cds-support-warning)",
  CRITICAL: "var(--cds-support-error)",
};

/**
 * Real movement vs a prior period (2026-09-14, shell/identity/KPI spec
 * §21-22, migration 0045's kpi_snapshots) — `direction` (what the number
 * did) and `impact` (whether that's good news) are kept separate on
 * purpose: Clients rising is `direction: "up"`/`impact: "positive"`,
 * Blocked tasks rising is `direction: "up"`/`impact: "negative"` — the
 * arrow's literal direction never implies whether it's good by itself.
 * Built by lib/pulse/kpi-trend.ts's `getKpiTrends()` from real stored
 * history; never fabricate one by hand (spec §32).
 */
export type KpiTrend = {
  direction: "up" | "down" | "flat";
  value: string;
  label?: string;
  impact: "positive" | "negative" | "neutral";
};

const TREND_COLOR: Record<KpiTrend["impact"], string> = {
  positive: "var(--cds-support-success)",
  negative: "var(--cds-support-error)",
  neutral: "var(--cds-text-secondary)",
};

const TREND_ICON: Record<KpiTrend["direction"], ComponentType<{ size?: number }> | null> = {
  up: ArrowUp,
  down: ArrowDown,
  flat: null,
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
 * `status`/`icon`/`trend`/`href` are all optional and additive — every
 * pre-2026-09-14 call site (44 pages) renders identically without them.
 * `status` moved from a small corner dot to a full-width top stripe
 * (2026-09-14, shell/identity/KPI spec §14) — same token, same meaning,
 * just a more legible anatomy (the spec's own card diagram puts the
 * status line across the full top edge, not tucked in a corner).
 */
export function KpiTile({
  label,
  value,
  status,
  icon: Icon,
  trend,
  href,
}: {
  label: string;
  value: string | number;
  status?: KpiStatus;
  icon?: ComponentType<{ size?: number }>;
  trend?: KpiTrend;
  href?: string;
}) {
  const TrendIcon = trend ? TREND_ICON[trend.direction] : null;

  const card = (
    <Tile
      style={{
        aspectRatio: "1",
        minWidth: "9rem",
        border: "1px solid var(--cds-border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        paddingTop: status ? "1.25rem" : undefined,
        overflow: "hidden",
      }}
    >
      {status && (
        <span
          aria-hidden
          title={STATUS_LABEL[status]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "0.1875rem",
            background: STATUS_COLOR[status],
          }}
        />
      )}
      {Icon ? (
        <div style={{ color: "var(--cds-icon-secondary)" }} aria-hidden>
          <Icon size={20} />
        </div>
      ) : (
        <span aria-hidden />
      )}
      <div>
        <p className="cds--type-heading-05 cds--type-semibold">{value}</p>
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
          {label}
        </p>
      </div>
      {trend ? (
        <p
          className="cds--type-helper-text-01"
          style={{ color: TREND_COLOR[trend.impact], display: "flex", alignItems: "center", gap: "0.25rem" }}
        >
          {TrendIcon ? <TrendIcon size={14} /> : <ArrowRight size={14} />}
          <span>
            {trend.value}
            {trend.label ? ` ${trend.label}` : ""}
          </span>
        </p>
      ) : status ? (
        <p className="cds--type-helper-text-01" style={{ color: STATUS_COLOR[status] }}>
          {STATUS_LABEL[status]}
        </p>
      ) : (
        <span aria-hidden />
      )}
    </Tile>
  );

  if (!href) return card;
  return (
    <Link href={href} style={{ color: "inherit", textDecoration: "none", display: "block" }}>
      {card}
    </Link>
  );
}
