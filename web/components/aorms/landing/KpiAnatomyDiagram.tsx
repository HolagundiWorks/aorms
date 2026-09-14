/**
 * Anatomy diagram for a Pulse KPI tile (2026-09-14 follow-up request,
 * restyled same day to match Carbon Design System's own anatomy-diagram
 * convention, then narrowed same day again to a single follow-up:
 * "only explain the alert line, and how a glance will give out the
 * information" — the earlier version's four callouts (stripe, icon,
 * figure, label) are gone; this now explains exactly one part (the
 * colored top stripe, renamed "alert line" per that request) and one
 * behavior (scanning a row of tiles for risk before reading any number).
 *
 * Two numbered panels, Carbon's own "Anatomy of line tabs" convention:
 * panel 1 is the single annotated tile (one lettered badge, one leader
 * line, on the stripe only); panel 2 demonstrates the glance itself —
 * five abstracted stripe-tiles in Pulse's real color order (success /
 * info / error / warning / neutral) with no numbers on them at all,
 * because the whole point of an alert line is that you don't need to
 * read a figure to know which ones need attention.
 *
 * One hand-authored inline SVG, not a live-measured overlay on the real
 * component — every coordinate is fixed in the diagram's own viewBox, so
 * the leader line always lands exactly on the stripe regardless of
 * viewport. `fill`/`stroke` on the mockup tile and the five glance-tiles
 * use Carbon CSS custom properties directly — SVG presentation
 * attributes resolve `var(--cds-*)` the same as any other CSS property.
 * The badge/leader line/scan arrow use a fixed magenta (Carbon's own
 * `magenta-60`, `#d02670`) as documentation-annotation chrome, distinct
 * from the semantic tokens used on the tiles themselves.
 */
const ANNOTATION = "#d02670";

const GLANCE_TILES = [
  { color: "var(--cds-support-success)", label: "On track" },
  { color: "var(--cds-support-info)", label: "Informational" },
  { color: "var(--cds-support-error)", label: "Needs attention" },
  { color: "var(--cds-support-warning)", label: "Watch" },
  { color: "var(--cds-text-secondary)", label: "Neutral" },
] as const;

export function KpiAnatomyDiagram() {
  return (
    <div>
      <svg viewBox="0 0 820 400" width="100%" role="img" aria-label="Anatomy of a Pulse KPI tile's alert line, and how it reads at a glance">
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

        {/* ── Panel 2: the glance — five stripe-only tiles, no figures ── */}
        <rect x="401" y="40" width="418" height="300" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
        <circle cx="425" cy="64" r="14" fill={ANNOTATION} />
        <text x="425" y="68.5" fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
          2
        </text>

        <text x="421" y="105" fontSize="12" fill="var(--cds-text-secondary)">
          Scan the row — color arrives before any number does
        </text>
        <line x1="421" y1="118" x2="789" y2="118" stroke={ANNOTATION} strokeWidth="1" />
        <polygon points="789,113 799,118 789,123" fill={ANNOTATION} />

        {GLANCE_TILES.map((tile, i) => {
          const x = 421 + i * 74;
          return (
            <g key={tile.label}>
              <rect x={x} y="150" width="64" height="90" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
              <rect x={x} y="150" width="64" height="4" fill={tile.color} />
            </g>
          );
        })}
      </svg>

      {/* ── Legend, Carbon's own "N. <name>" convention — one entry per
          panel, both about the same single part. ── */}
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
              A 4px strip of semantic color — support-success, support-warning, or support-error — along the top edge of
              every KPI tile. It carries no number and no words; it&apos;s pure state.
            </p>
          </div>
        </div>
        <div>
          <p className="cds--type-heading-compact-01">2. How a glance reads it</p>
          <p className="cds--type-label-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Your eye registers color before it registers a figure or a label — that&apos;s what lets a whole row of tiles
            be read for risk in under a second. You don&apos;t read five numbers to know two of them need a look; you see
            two stripes that aren&apos;t green, the same way a traffic light works before you&apos;d ever read a sign.
          </p>
        </div>
      </div>
    </div>
  );
}
