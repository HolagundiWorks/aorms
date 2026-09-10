import { Tile } from "@carbon/react";
import { generateDailyBrief } from "../../../lib/actions/daily-brief";
import { TodaysBriefRefresh } from "./TodaysBriefRefresh";

/**
 * Today's Brief (2026-09-10) — the first thing on the dashboard. Server
 * Component: generates the brief once at page render (no click needed
 * to see it), then hands the text to a small Client Component for the
 * optional "Refresh" action. See lib/ai/phraser.ts and lib/actions/
 * daily-brief.ts for the actual generation pipeline.
 */
export async function TodaysBrief() {
  const { output, error } = await generateDailyBrief();

  return (
    <Tile style={{ marginBottom: "1.5rem" }}>
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
