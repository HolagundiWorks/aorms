"use client";

/**
 * Turns the OPERATIONAL_LEAKAGE cause list into an actual hours/₹
 * calculator (2026-09-14 follow-up request) — the user's own worked
 * example: a project run at ~300 hours, 15% unbilled revisions ≈ 45
 * hours. Two manual inputs only (typical project hours, internal hourly
 * value); every cause's leaked hours and leaked cost are *calculated*
 * from `OPERATIONAL_LEAKAGE.causes[].pctOfHours`, not separately typed
 * in per cause — that's the "remove that manual entry field" half of the
 * request. "Cost overruns" was briefly excluded from this math as a
 * budget-overrun pattern rather than an hours share, but was merged
 * back in (2026-09-14 same-day follow-up: "Illustrative ROI... merge
 * the cost overrun with it" — the disclaimer this whole calculator
 * already carries covers it too, no reason to carve it out) at an
 * illustrative 10%, so every cause now renders the same hrs/₹ figure.
 *
 * The old, separate ROI Calculator (annual fees / mgmt+admin hours /
 * potential-annual-value form) was removed (2026-09-14 follow-up
 * request) once this component covered the same "what does leakage
 * cost" ground directly from real cause hours — this is now the one
 * cost calculator on the page, not one of two. Its disclaimer
 * (`ROI_DISCLAIMER`) moved here with it.
 *
 * "Cost overruns" has no own tile (2026-09-14 same-day follow-up:
 * "remove the cost overrun tile") but its `pctOfHours` still counts
 * toward `TOTAL_LEAKAGE_PCT` and the totals below — the prior request
 * ("merge the cost overrun with it") was to fold its contribution into
 * the aggregate, not to give it a standalone card.
 *
 * The totals block used to sit as its own full-width row underneath the
 * cause grid, which (5 cause tiles, an even-ish `auto-fit` CSS grid)
 * left a real phantom empty cell next to "Manual timesheet entries" —
 * the same composition bug class already fixed once this session on
 * TodaysBriefingPanel.tsx. Same fix here (2026-09-14 follow-up: "move
 * the tile from bottom to the place [the empty cell]"): flex-wrap
 * instead of CSS grid, and the totals block is now one of the wrapped
 * items (a wider one) rather than a separate row, so it fills that
 * space instead of leaving it blank.
 */
import { useMemo, useState } from "react";
import { NumberInput, Tile } from "@carbon/react";
import { OPERATIONAL_LEAKAGE, ROI_DISCLAIMER } from "../../../lib/marketing-content";

const TILE_CAUSES = OPERATIONAL_LEAKAGE.causes.filter((cause) => cause.title !== "Cost overruns");

export const TOTAL_LEAKAGE_PCT = OPERATIONAL_LEAKAGE.causes.reduce((sum, cause) => sum + (cause.pctOfHours ?? 0), 0);

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function OperationalLeakageCalculator() {
  const [projectHours, setProjectHours] = useState(300);
  const [hourlyValue, setHourlyValue] = useState(1000);

  const { tileRows, totalHours, totalCost } = useMemo(() => {
    const withFigures = (cause: (typeof OPERATIONAL_LEAKAGE.causes)[number]) => {
      const hours = (projectHours * cause.pctOfHours) / 100;
      const cost = hours * hourlyValue;
      return { ...cause, hours, cost };
    };
    const tileRows = TILE_CAUSES.map(withFigures);
    // Totals sum every cause, including "Cost overruns" (no tile of its
    // own, but its share still counts toward the aggregate).
    const totalHours = OPERATIONAL_LEAKAGE.causes.map(withFigures).reduce((sum, r) => sum + r.hours, 0);
    const totalCost = totalHours * hourlyValue;
    return { tileRows, totalHours, totalCost };
  }, [projectHours, hourlyValue]);

  return (
    <div>
      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", maxWidth: 640 }}>
        <div style={{ flex: "1 1 14rem" }}>
          <NumberInput
            id="leakage-project-hours"
            label="Typical project hours (give or take)"
            value={projectHours}
            onChange={(_e, { value }) => setProjectHours(Number(value) || 0)}
            min={0}
            step={50}
            hideSteppers
          />
        </div>
        <div style={{ flex: "1 1 14rem" }}>
          <NumberInput
            id="leakage-hourly-value"
            label="Internal hourly value (₹)"
            value={hourlyValue}
            onChange={(_e, { value }) => setHourlyValue(Number(value) || 0)}
            min={0}
            step={100}
            hideSteppers
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1.5rem" }}>
        {tileRows.map((cause) => (
          <Tile key={cause.title} style={{ flex: "1 1 15rem" }}>
            <p className="cds--type-productive-heading-02">{cause.title}</p>
            <p className="cds--type-body-01" style={{ marginTop: "0.375rem", color: "var(--cds-text-secondary)" }}>
              {cause.body}
            </p>
            <div style={{ marginTop: "0.875rem", paddingTop: "0.75rem", borderTop: "1px solid var(--cds-border-subtle)" }}>
              <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                {cause.pctOfHours}% of project hours
              </p>
              <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem", color: "var(--cds-support-info)" }}>
                {Math.round(cause.hours)} hrs · {formatInr(cause.cost)}
              </p>
            </div>
          </Tile>
        ))}

        {/* Totals — a wrapped flex item like the cause tiles above, not a
            separate full-width row, so it fills the row's remaining
            space instead of leaving a phantom empty cell beside it. */}
        <div
          style={{
            flex: "2 1 30rem",
            border: "1px solid var(--cds-border-subtle)",
            borderLeft: "3px solid var(--cds-support-info)",
            background: "var(--cds-layer)",
            padding: "1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
              Operational leakage on a project like this — {TOTAL_LEAKAGE_PCT}% of hours worked
            </p>
            <p className="cds--type-heading-04" style={{ marginTop: "0.25rem" }}>
              {Math.round(totalHours)} hrs · {formatInr(totalCost)}
            </p>
          </div>
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", maxWidth: 320 }}>
            This is what AORMS gives back — replacing manual timesheet entry, priority-guessing, and status-chasing meetings with a tracked, single operating record.
          </p>
        </div>
      </div>

      <p className="cds--type-caption-01" style={{ marginTop: "1.5rem", color: "var(--cds-text-secondary)" }}>
        {ROI_DISCLAIMER}
      </p>
    </div>
  );
}
