import type { ComponentType } from "react";
import Link from "next/link";
import { Tile } from "@carbon/react";
import { ArrowUp, ArrowDown, ArrowRight } from "@carbon/icons-react";
import { KPI_SEVERITY } from "../../lib/kpi-severity";

/**
 * The status read some KPIs support (2026-09-13, extended to 4 tiers
 * 2026-09-15) — deliberately NOT every KPI: a status only makes sense
 * where "more" has a real bad direction (absences, an aging outstanding
 * balance, a request pile-up). A pure headline count like Clients/
 * Projects/Proposals/Total billed has no such direction (more is never
 * bad), so those stay plain, unstatused numbers — see dashboard/page.tsx's
 * own per-metric threshold comments for where each status actually
 * comes from.
 *
 * 4-tier extension (2026-09-15, closing a real landing-page/product gap
 * found by cross-verification: the marketing site's KPI-anatomy diagram
 * and Pulse tiles document a 4-color green/yellow/orange/red alert-line
 * scale — `KPI_SEVERITY`, `lib/kpi-severity.ts` — but this shared tile
 * only had 3 tiers, so "every KPI tile across AORMS carries the same
 * alert line" wasn't actually true of the real product). `WATCH` is the
 * new tier, between `NEEDS_INTERVENTION` (yellow) and `CRITICAL` (red) —
 * existing call sites that only ever pass NORMAL/NEEDS_INTERVENTION/
 * CRITICAL are unaffected; `WATCH` is additive, for a caller that wants
 * to distinguish "worth a look" from "needs attention soon."
 */
export type KpiStatus = "NORMAL" | "NEEDS_INTERVENTION" | "WATCH" | "CRITICAL";

const STATUS_LABEL: Record<KpiStatus, string> = {
  NORMAL: "Normal",
  NEEDS_INTERVENTION: "Needs intervention",
  WATCH: "Needs attention",
  CRITICAL: "Critical",
};

// Reads from the same KPI_SEVERITY scale the landing page's KPI-anatomy
// diagram and TodaysBriefingPanel.tsx use (lib/kpi-severity.ts) — one
// source for the real product and the marketing page that documents it,
// so they can't drift apart the way they had before this fix.
const STATUS_COLOR: Record<KpiStatus, string> = {
  NORMAL: KPI_SEVERITY.green,
  NEEDS_INTERVENTION: KPI_SEVERITY.yellow,
  WATCH: KPI_SEVERITY.orange,
  CRITICAL: KPI_SEVERITY.red,
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

  // Compact tile (2026-09-30, explicit request: "reduce the size of KPI
  // tile to 50% of current size"). Was a 1:1 square at ~11rem (176px);
  // now 5.5rem (88px) tall — exactly half the height — and 9rem wide.
  // Width is 82% rather than 50% on purpose: a rupee value like
  // "₹41,87,000" would truncate at 5.5rem. Anatomy: full-width value over a 1-line label (+ icon at the right) (2 lines when there is no trend row), the
  // status stripe across the top, and — only when present — a trend line.
  // Status text stays available to screen readers via a visually-hidden
  // span, and to sighted users via the stripe's tooltip.
  const card = (
    <Tile
      style={{
        inlineSize: "9rem",
        blockSize: "5.5rem",
        padding: "0.5rem 0.75rem",
        border: "1px solid var(--cds-border-subtle)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0.125rem",
        position: "relative",
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
      {status && (
        <span
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}
        >
          {STATUS_LABEL[status]}
        </span>
      )}
      <p
        className="cds--type-heading-03 cds--type-semibold"
        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
        title={String(value)}
      >
        {value}
      </p>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.25rem", minWidth: 0 }}>
        <p
          className="cds--type-helper-text-01"
          style={{
            color: "var(--cds-text-secondary)",
            display: "-webkit-box",
            WebkitLineClamp: trend ? 1 : 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: "1rem",
            minWidth: 0,
          }}
          title={label}
        >
          {label}
        </p>
        {Icon && (
          <span style={{ color: "var(--cds-icon-secondary)", flex: "none", display: "flex" }} aria-hidden>
            <Icon size={16} />
          </span>
        )}
      </div>
      {trend && (
        <p
          className="cds--type-helper-text-01"
          style={{
            color: TREND_COLOR[trend.impact],
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            overflow: "hidden",
            whiteSpace: "nowrap",
            lineHeight: "1rem",
          }}
        >
          {TrendIcon ? <TrendIcon size={12} /> : <ArrowRight size={12} />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {trend.value}
            {trend.label ? ` ${trend.label}` : ""}
          </span>
        </p>
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
