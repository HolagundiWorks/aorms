import { Chat, Send, Calculator, CheckmarkFilled } from "@carbon/icons-react";
import { Tile } from "@carbon/react";
import { REVISION_LIFECYCLE } from "../../lib/marketing-content";
import { AnimatedNumber } from "./AnimatedNumber";

/**
 * Horizontal masonry tile row for the revision lifecycle (2026-09-14,
 * explicit direction: "horizontal masonry layout... use tiles for data
 * presentation, and animate the data"). Four stage tiles, same width AND
 * same fixed height (`TILE_HEIGHT` — 2026-09-14 follow-up: "all tiles
 * should be of same height", since stage 3's extra cost-delta block
 * otherwise made it taller than the rest), with staggered vertical
 * offsets (`OFFSETS` below) so the row still reads as a brick-laid strip
 * left to right rather than four flush-aligned cards — the "horizontal"
 * distinction from a conventional (vertical, column-based) masonry grid.
 * Both the offset and the fixed height are zeroed on narrow viewports
 * (`.revision-masonry` in globals.scss), where a single stacked column
 * reads better than a fixed box height.
 *
 * One illustrative "in flight" example is layered onto stage 3 (Costed
 * by the team lead) — the same placeholder project used elsewhere on
 * this page — with its cost-delta figure animated via AnimatedNumber,
 * consistent with the billing forecast panel above it.
 */
const ICONS = [Chat, Send, Calculator, CheckmarkFilled] as const;
const OFFSETS = ["0", "2rem", "0.5rem", "2.75rem"] as const;
const TILE_HEIGHT = "23rem";
const COST_DELTA = 18500; // ₹18,500 illustrative cost delta, not a real figure

export function RevisionLifecyclePanel() {
  return (
    <div className="revision-masonry" aria-hidden>
      {REVISION_LIFECYCLE.stages.map((stage, i) => {
        const Icon = ICONS[i];
        return (
          <div key={stage.n} className="revision-masonry-item" style={{ marginTop: OFFSETS[i], height: TILE_HEIGHT }}>
            <Tile style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="cds--type-code-01" style={{ color: "var(--cds-text-placeholder)" }}>
                  {stage.n}
                </span>
                <Icon size={20} style={{ color: "var(--cds-icon-secondary)" }} />
              </div>
              <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.75rem" }}>
                {stage.title}
              </h3>
              <p className="cds--type-body-01" style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}>
                {stage.body}
              </p>
              {i === 2 && (
                <div style={{ marginTop: "auto", paddingTop: "0.875rem", borderTop: "1px solid var(--cds-border-subtle)" }}>
                  <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                    Cost delta on this revision
                  </p>
                  <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem", color: "var(--cds-support-warning)" }}>
                    <AnimatedNumber value={COST_DELTA} kind="inr-delta" />
                  </p>
                </div>
              )}
            </Tile>
          </div>
        );
      })}
    </div>
  );
}
