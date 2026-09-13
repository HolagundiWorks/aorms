import { Grid, Column, Tile } from "@carbon/react";
import { generateDailyBrief } from "../../../lib/actions/daily-brief";
import { TodaysBriefRefresh } from "./TodaysBriefRefresh";
import { ActionQueueList } from "./ActionQueue";
import type { PriorityItem } from "../../../lib/dashboard/priority";

/**
 * Today's Brief (2026-09-10, merged with the Action Queue 2026-09-14 per
 * UI-polish feedback) — the first thing on the dashboard. One full-width
 * Tile, split into the brief itself (~1/3, left) and a "Next up" side
 * panel (~2/3, right) carrying the same ranked Action Queue rows that
 * used to be their own separate full-width block below this one — see
 * ActionQueue.tsx's `ActionQueueList` (the bare rows, no Tile/heading of
 * its own) for the shared rendering. Server Component: generates the
 * brief once at page render (no click needed to see it) and receives the
 * already-fetched priority pool as a prop (computed once in
 * app/(app)/pulse/page.tsx, not re-queried here); the brief text then
 * hands off to a small Client Component for the optional "Refresh"
 * action. See lib/ai/phraser.ts and lib/actions/daily-brief.ts for the
 * actual generation pipeline.
 *
 * Columns are lg={5}/lg={11} on Carbon's 16-column grid — 5/16 = 31.25%,
 * the closest whole-column split to the requested 1/3 — and stack to
 * full width below `lg` (md/sm), same breakpoint discipline as the rest
 * of the shell (see AppShell.tsx's own note on Carbon's real breakpoint
 * tokens).
 */
export async function TodaysBrief({ items }: { items: PriorityItem[] }) {
  const { output, error } = await generateDailyBrief();

  return (
    <Tile style={{ marginBottom: "1rem" }}>
      <Grid narrow>
        <Column sm={4} md={8} lg={5}>
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
        </Column>
        <Column sm={4} md={8} lg={11}>
          <h2 className="cds--type-heading-02" style={{ marginBottom: "0.5rem" }}>
            Next up
          </h2>
          {/* Bounded height + its own internal scroll, not the page —
              same "content scrolls inside its own Tile" pattern
              DashboardTabs.tsx uses (2026-09-13 "single screen"
              request). 8 rows at this row height comfortably clears
              18rem without scrolling on a normal viewport. */}
          <div style={{ maxHeight: "18rem", overflowY: "auto" }}>
            <ActionQueueList items={items} />
          </div>
        </Column>
      </Grid>
    </Tile>
  );
}
