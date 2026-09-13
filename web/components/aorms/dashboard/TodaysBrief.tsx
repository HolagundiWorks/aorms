import { Tile } from "@carbon/react";
import { generateDailyBrief } from "../../../lib/actions/daily-brief";
import { TodaysBriefRefresh } from "./TodaysBriefRefresh";

/**
 * Today's Brief (2026-09-10; briefly merged into one Tile with "Next up"
 * on 2026-09-14, reverted same day — nesting Carbon's `Grid` inside a
 * `Tile` cancels the Tile's own edge padding, since `Grid`'s negative
 * outer margins are meant for full-bleed page layouts, not content
 * that's already padded by a container. Text sat flush against the tile
 * edges as a result. Back to its own standalone Tile; the 1/3-width
 * pairing with "Next up" now lives one level up, in
 * app/(app)/pulse/page.tsx, as two separate Tiles inside Carbon Column
 * siblings — Grid/Column wraps *around* each Tile there, so neither
 * Tile's own padding is touched.
 *
 * Server Component: generates the brief once at page render (no click
 * needed to see it), then hands the text to a small Client Component for
 * the optional "Refresh" action. See lib/ai/phraser.ts and
 * lib/actions/daily-brief.ts for the actual generation pipeline.
 */
export async function TodaysBrief() {
  const { output, error } = await generateDailyBrief();

  return (
    <Tile style={{ height: "100%" }}>
      <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-support-info)", marginBottom: "0.5rem" }}>
        Today's Brief
      </p>
      {error ? (
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          {error}
        </p>
      ) : (
        <TodaysBriefRefresh initialText={output} />
      )}
    </Tile>
  );
}
