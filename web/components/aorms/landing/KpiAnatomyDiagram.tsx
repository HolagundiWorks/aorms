/**
 * Anatomy diagram for a Pulse KPI tile (2026-09-14 follow-up request,
 * restyled same day to match Carbon Design System's own anatomy-diagram
 * convention — e.g. the "Anatomy of line tabs" page in the Carbon style
 * guide: a numbered panel holding the example, small lettered circle
 * badges pinned directly on the example at each part's anchor point via
 * a thin leader line, and a lettered legend underneath naming each part.
 * Carbon has no official named "KPI card" component — this tile (and the
 * real product's own `KpiTile.tsx`) is a composition of stock Carbon
 * primitives (`Tile`, type tokens, semantic color tokens), which is what
 * the legend below describes honestly rather than inventing an official
 * Carbon component name that doesn't exist.
 *
 * One hand-authored inline SVG, not a live-measured overlay on the real
 * component — every coordinate is fixed in the diagram's own viewBox, so
 * leader lines always land exactly on the part they annotate regardless
 * of viewport (the whole diagram scales together as one SVG). `fill`/
 * `stroke` on the mockup tile use Carbon CSS custom properties directly —
 * SVG presentation attributes resolve `var(--cds-*)` the same as any
 * other CSS property. The badges and leader lines themselves use a fixed
 * magenta (Carbon's own `magenta-60`, `#d02670`) rather than a semantic
 * `--cds-*` token — this is documentation-annotation chrome layered over
 * the example, not tile UI, matching how Carbon's own style-guide pages
 * annotate their examples in a color no real component uses.
 */
const ANNOTATION = "#d02670";

const LEGEND = [
  {
    letter: "A",
    title: "Status stripe",
    body: "A semantic color token (support-success / -warning / -error) — flags at a glance whether this number needs attention, before you even read it.",
  },
  {
    letter: "B",
    title: "Icon",
    body: "A 20px Carbon pictogram in the icon-secondary token — names what's being measured, not just decoration.",
  },
  {
    letter: "C",
    title: "Figure",
    body: "Carbon's heading-04 type scale — the one number this tile exists to show.",
  },
  {
    letter: "D",
    title: "Label",
    body: "Carbon's label-01 type token, in text-secondary — deliberately smaller and quieter than the figure it names.",
  },
] as const;

function Badge({ x, y, letter }: { x: number; y: number; letter: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r="13" fill={ANNOTATION} />
      <text x={x} y={y + 4.5} fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
        {letter}
      </text>
    </g>
  );
}

export function KpiAnatomyDiagram() {
  return (
    <div>
      <svg viewBox="0 0 820 360" width="100%" role="img" aria-label="Anatomy of a Pulse KPI tile: status stripe, icon, figure, and label">
        {/* ── Panel frame + number badge, Carbon anatomy-diagram convention ── */}
        <rect x="1" y="40" width="818" height="300" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
        <circle cx="25" cy="64" r="14" fill={ANNOTATION} />
        <text x="25" y="68.5" fontSize="13" fontWeight="600" fill="white" textAnchor="middle">
          1
        </text>

        {/* ── The example tile itself (mirrors TodaysBriefingPanel.tsx's real markup) ── */}
        <g>
          <rect x="140" y="90" width="260" height="180" fill="var(--cds-layer)" stroke="var(--cds-border-subtle)" strokeWidth="1" />
          {/* A. Status stripe */}
          <rect x="140" y="90" width="260" height="4" fill="var(--cds-support-success)" />
          {/* B. Icon (simplified banknote glyph, standing in for a real Carbon pictogram) */}
          <rect x="164" y="118" width="28" height="18" rx="2" fill="none" stroke="var(--cds-icon-secondary)" strokeWidth="1.5" />
          <circle cx="178" cy="127" r="4" fill="none" stroke="var(--cds-icon-secondary)" strokeWidth="1.5" />
          {/* C. Figure */}
          <text x="164" y="192" fontSize="34" fontWeight="600" fill="var(--cds-text-primary)">
            ₹8,42,500
          </text>
          {/* D. Label */}
          <text x="164" y="220" fontSize="13" fill="var(--cds-text-secondary)">
            Ready to bill
          </text>
        </g>

        {/* ── Anchor dots on the tile ── */}
        <circle cx="270" cy="92" r="3" fill={ANNOTATION} />
        <circle cx="178" cy="127" r="3" fill={ANNOTATION} />
        <circle cx="164" cy="176" r="3" fill={ANNOTATION} />
        <circle cx="164" cy="212" r="3" fill={ANNOTATION} />

        {/* ── Leader lines, anchor dot → lettered badge ── */}
        <line x1="270" y1="92" x2="560" y2="65" stroke={ANNOTATION} strokeWidth="1" />
        <line x1="178" y1="127" x2="620" y2="140" stroke={ANNOTATION} strokeWidth="1" />
        <line x1="164" y1="176" x2="560" y2="215" stroke={ANNOTATION} strokeWidth="1" />
        <line x1="164" y1="212" x2="620" y2="290" stroke={ANNOTATION} strokeWidth="1" />

        {/* ── Lettered badges ── */}
        <Badge x={560} y={65} letter="A" />
        <Badge x={620} y={140} letter="B" />
        <Badge x={560} y={215} letter="C" />
        <Badge x={620} y={290} letter="D" />
      </svg>

      {/* ── Legend, Carbon's own convention: "1. <name>" heading, then
          "<letter>. <part>" entries ── */}
      <div style={{ marginTop: "1.5rem" }}>
        <p className="cds--type-heading-compact-01" style={{ color: "var(--cds-text-primary)" }}>
          1. Pulse KPI tile
        </p>
        <div
          style={{
            marginTop: "0.75rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
            gap: "1rem 2rem",
          }}
        >
          {LEGEND.map((item) => (
            <div key={item.letter} style={{ display: "flex", gap: "0.75rem" }}>
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
                {item.letter}
              </span>
              <div>
                <p className="cds--type-heading-compact-01">{item.title}</p>
                <p className="cds--type-label-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
