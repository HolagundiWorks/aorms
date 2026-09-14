/**
 * The one shared 4-color alert-line severity scale for every KPI tile
 * across the landing page — introduced 2026-09-14 (KPI anatomy diagram's
 * "alert line" callout), then applied to the real tiles themselves
 * (`TodaysBriefingPanel.tsx`, used in both Hero and Pulse) same day, per
 * explicit follow-up: "update the alert colours in kpi tiles in hero
 * section and pulse section." Exactly four colors, read as an escalating
 * severity — green (good progress) → yellow / orange (needs attention,
 * orange more urgent) → red (alert) — never used to tell one KPI apart
 * from another (that's what the icon + label are for).
 *
 * Carbon has no dedicated `--cds-support-*` token for orange, so that
 * one value is Carbon's own orange-60 palette hex rather than a
 * semantic token — same treatment given to the anatomy diagram's
 * annotation chrome.
 */
export const KPI_SEVERITY = {
  green: "var(--cds-support-success)",
  yellow: "var(--cds-support-warning)",
  orange: "#eb6200",
  red: "var(--cds-support-error)",
} as const;
