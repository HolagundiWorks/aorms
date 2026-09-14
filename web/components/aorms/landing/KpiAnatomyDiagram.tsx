/**
 * "How to read a Pulse KPI tile" — simplified 2026-09-14, same-day
 * follow-up: "restructure the anatomy, keep it simple." Earlier drafts
 * grew into a two-panel Carbon-anatomy-diagram-style SVG with numbered
 * panels, lettered circle badges, leader lines, and a second panel of
 * four abstract stripe tiles — all of that is gone. What's left is the
 * two things that actually matter: one real tile mockup with its alert
 * line called out in plain text, and the four-color severity key
 * (`KPI_SEVERITY`, `lib/kpi-severity.ts` — the same tokens the real
 * `TodaysBriefingPanel.tsx` tiles use) explaining what each color means.
 * Plain HTML/CSS, not hand-coded SVG coordinates — one less thing to
 * keep in sync by hand.
 */
import { Money } from "@carbon/icons-react";
import { KPI_SEVERITY } from "../../../lib/kpi-severity";

const SEVERITY_SCALE = [
  { color: KPI_SEVERITY.green, name: "Green", meaning: "Good progress — on track, no action needed." },
  { color: KPI_SEVERITY.yellow, name: "Yellow", meaning: "Needs attention." },
  { color: KPI_SEVERITY.orange, name: "Orange", meaning: "Needs attention — more urgent than yellow." },
  { color: KPI_SEVERITY.red, name: "Red", meaning: "Alert — needs immediate action." },
] as const;

export function KpiAnatomyDiagram() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-start" }}>
      {/* Example tile, with just its alert line called out. Fixed width
          on the wrapper itself (not just the tile inside it) — the
          caption below has no width of its own, and a flex item with no
          explicit width shrink-wraps to its *widest* child's max-content
          size, which for an unwrapped line of caption text is far wider
          than the 13rem tile (found live: pushed this block to ~560px,
          leaving no room for the color key beside it). */}
      <div style={{ flex: "0 0 auto", width: "13rem" }}>
        <div style={{ width: "13rem", border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }}>
          <div style={{ height: "4px", background: KPI_SEVERITY.green }} />
          <div style={{ padding: "1rem" }}>
            <Money size={18} style={{ color: "var(--cds-icon-secondary)" }} />
            <p className="cds--type-heading-04" style={{ marginTop: "0.5rem" }}>
              ₹8,42,500
            </p>
            <p className="cds--type-label-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
              Ready to bill
            </p>
          </div>
        </div>
        <p className="cds--type-caption-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
          ↑ The alert line — a 4px strip of status color along the top edge. No number, no words, pure status.
        </p>
      </div>

      {/* The four-color key it reads from. */}
      <div style={{ flex: "1 1 16rem" }}>
        <p className="cds--type-heading-compact-01">What each color means</p>
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
    </div>
  );
}
