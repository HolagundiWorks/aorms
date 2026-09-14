/**
 * Anatomy diagram for a Pulse KPI tile (2026-09-14 follow-up request,
 * restyled same day to match Carbon Design System's own anatomy-diagram
 * convention, then narrowed same day to a single follow-up: "only
 * explain the alert line, and how a glance will give out the
 * information" — the earlier version's four callouts (stripe, icon,
 * figure, label) are gone; this explains exactly one part (the colored
 * top stripe, renamed "alert line") and one behavior (scanning a row of
 * tiles for risk before reading any number).
 *
 * Colors corrected same day again: the alert line is a STATUS scale
 * (how this one number is performing right now), not a category label
 * that tells tiles apart from each other — "use only alert colours red,
 * orange, yellow and green ... it's not to differentiate the element
 * kpi, but to show status." The panel-2 glance demo dropped its earlier
 * five-color set (success/info/error/warning/neutral, which read as
 * five different *kinds* of tile) for exactly those four, ordered as an
 * escalating severity scale, each with its meaning spelled out below —
 * Carbon has no dedicated semantic token for orange, so that one swatch
 * uses Carbon's own orange-60 palette value as a fixed color rather than
 * a `--cds-*` token, the same treatment already given to this diagram's
 * magenta annotation chrome.
 *
 * Two numbered panels, Carbon's own "Anatomy of line tabs" convention:
 * panel 1 is the single annotated tile (one lettered badge, one leader
 * line, on the stripe only); panel 2 demonstrates the glance itself —
 * four stripe-only tiles, one per severity color, with no numbers on
 * them at all, because the whole point of an alert line is that you
 * don't need to read a figure to know which ones need attention.
 *
 * One hand-authored inline SVG, not a live-measured overlay on the real
 * component — every coordinate is fixed in the diagram's own viewBox, so
 * the leader line always lands exactly on the stripe regardless of
 * viewport. `fill`/`stroke` on the mockup tile use Carbon CSS custom
 * properties directly — SVG presentation attributes resolve `var(--cds-*)`
 * the same as any other CSS property. The badge/leader line/scan arrow
 * use a fixed magenta (Carbon's own `magenta-60`, `#d02670`) as
 * documentation-annotation chrome, distinct from the status colors used
 * on the tiles themselves.
 */
const ANNOTATION = "#d02670";
const ORANGE = "#eb6200"; // Carbon's orange-60 palette value — no dedicated --cds-support-* token for orange exists

const SEVERITY_SCALE = [
  { color: "var(--cds-support-success)", name: "Green", meaning: "On track — no action needed." },
  { color: "var(--cds-support-warning)", name: "Yellow", meaning: "Caution — worth a look." },
  { color: ORANGE, name: "Orange", meaning: "Warning — needs attention soon." },
  { color: "var(--cds-support-error)", name: "Red", meaning: "Critical — needs attention now." },
] as const;

export function KpiAnatomyDiagram() {
  return (
    <div>
      <svg viewBox="0 0 820 400" width="100%" role="img" aria-label="Anatomy of a Pulse KPI tile's alert line, and the red/orange/yellow/green status scale it reads at a glance">
        {/* ── Panel 1: the annotated tile — alert line only ── */}
        <rect x="1" y="40" width="380" height="300" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
        <circle cx="25" cy="64" r="14" fill={ANNOTATION} />
        <text x="25" y="68.5" fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
          1
        </text>

        <g>
          <rect x="60" y="90" width="260" height="180" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
          {/* Alert line */}
          <rect x="60" y="90" width="260" height="4" fill="var(--cds-support-success)" />
          {/* Icon + figure + label, drawn for context but not annotated —
              this diagram is only about the stripe above them. */}
          <rect x="84" y="118" width="28" height="18" rx="2" fill="none" stroke="var(--cds-icon-secondary)" strokeWidth="1.5" />
          <circle cx="98" cy="127" r="4" fill="none" stroke="var(--cds-icon-secondary)" strokeWidth="1.5" />
          <text x="84" y="192" fontSize="34" fontWeight="600" fill="var(--cds-text-primary)">
            ₹8,42,500
          </text>
          <text x="84" y="220" fontSize="13" fill="var(--cds-text-secondary)">
            Ready to bill
          </text>
        </g>

        <circle cx="190" cy="92" r="3" fill={ANNOTATION} />
        <line x1="190" y1="92" x2="340" y2="62" stroke={ANNOTATION} strokeWidth="1" />
        <circle cx="340" cy="62" r="13" fill={ANNOTATION} />
        <text x="340" y="66.5" fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
          A
        </text>

        {/* ── Panel 2: the glance — four stripe-only tiles, one per
            severity color, no figures ── */}
        <rect x="401" y="40" width="418" height="300" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
        <circle cx="425" cy="64" r="14" fill={ANNOTATION} />
        <text x="425" y="68.5" fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
          2
        </text>

        <text x="421" y="105" fontSize="12" fill="var(--cds-text-secondary)">
          Same tile, four states — color is status, not identity
        </text>
        <line x1="421" y1="118" x2="789" y2="118" stroke={ANNOTATION} strokeWidth="1" />
        <polygon points="789,113 799,118 789,123" fill={ANNOTATION} />

        {SEVERITY_SCALE.map((tile, i) => {
          const x = 421 + i * 92;
          return (
            <g key={tile.name}>
              <rect x={x} y="150" width="80" height="90" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
              <rect x={x} y="150" width="80" height="4" fill={tile.color} />
              <text x={x + 40} y="205" fontSize="11" fill="var(--cds-text-secondary)" textAnchor="middle">
                {tile.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Legend, Carbon's own "N. <name>" convention — one entry per
          panel. ── */}
      <div
        style={{
          marginTop: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(18rem, 1fr))",
          gap: "1.5rem 2rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <span
            aria-hidden
            style={{
              flex: "0 0 auto",
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "50%",
              background: ANNOTATION,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: 600,
            }}
          >
            A
          </span>
          <div>
            <p className="cds--type-heading-compact-01">1. Alert line</p>
            <p className="cds--type-label-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
              A 4px strip of status color along the top edge of every KPI tile. It carries no number and no words — and
              it doesn&apos;t tell one KPI apart from another either. It shows how <em>this</em> figure is performing
              right now.
            </p>
          </div>
        </div>
        <div>
          <p className="cds--type-heading-compact-01">2. How a glance reads it</p>
          <p className="cds--type-label-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Your eye registers color before it registers a figure or a label — that&apos;s what lets a whole row of
            tiles be read for risk in under a second, the same way a traffic light works before you&apos;d ever read a
            sign.
          </p>
        </div>
      </div>

      {/* ── Color key — explicit, since the whole point is a fixed
          4-color status scale, not five different tile categories. ── */}
      <div
        style={{
          marginTop: "1.5rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
          gap: "0.75rem 1.5rem",
        }}
      >
        {SEVERITY_SCALE.map((tile) => (
          <div key={tile.name} style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span aria-hidden style={{ flex: "0 0 auto", width: "0.875rem", height: "0.875rem", background: tile.color }} />
            <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
              <strong style={{ color: "var(--cds-text-primary)" }}>{tile.name}</strong> — {tile.meaning}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
