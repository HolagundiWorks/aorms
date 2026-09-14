"use client";

/**
 * Turns the OPERATIONAL_LEAKAGE cause list into an actual hours/₹
 * calculator (2026-09-14 follow-up request) — the user's own worked
 * example: a project run at ~300 hours, 15% unbilled revisions ≈ 45
 * hours. Two manual inputs only (typical project hours, internal hourly
 * value); every cause's leaked hours and leaked cost are *calculated*
 * from `OPERATIONAL_LEAKAGE.causes[].pctOfHours`, not separately typed
 * in per cause — that's the "remove that manual entry field" half of the
 * request. "Cost overruns" has no `pctOfHours` (it's a budget pattern,
 * not a share of hours worked) so it's shown without a figure rather
 * than forced into the same math.
 *
 * `RoiCalculator.tsx` reads `TOTAL_LEAKAGE_PCT` from this same source
 * so its "estimated fee leakage" is this calculation, not a second,
 * separately-guessed manual percentage.
 */
import { useMemo, useState } from "react";
import { NumberInput, Tile } from "@carbon/react";
import { OPERATIONAL_LEAKAGE } from "../../../lib/marketing-content";

export const TOTAL_LEAKAGE_PCT = OPERATIONAL_LEAKAGE.causes.reduce((sum, cause) => sum + (cause.pctOfHours ?? 0), 0);

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function OperationalLeakageCalculator() {
  const [projectHours, setProjectHours] = useState(300);
  const [hourlyValue, setHourlyValue] = useState(1000);

  const { rows, totalHours, totalCost } = useMemo(() => {
    const rows = OPERATIONAL_LEAKAGE.causes.map((cause) => {
      const hours = cause.pctOfHours != null ? (projectHours * cause.pctOfHours) / 100 : null;
      const cost = hours != null ? hours * hourlyValue : null;
      return { ...cause, hours, cost };
    });
    const totalHours = rows.reduce((sum, r) => sum + (r.hours ?? 0), 0);
    const totalCost = totalHours * hourlyValue;
    return { rows, totalHours, totalCost };
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(15rem, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
        {rows.map((cause) => (
          <Tile key={cause.title}>
            <p className="cds--type-productive-heading-02">{cause.title}</p>
            <p className="cds--type-body-01" style={{ marginTop: "0.375rem", color: "var(--cds-text-secondary)" }}>
              {cause.body}
            </p>
            {cause.hours != null ? (
              <div style={{ marginTop: "0.875rem", paddingTop: "0.75rem", borderTop: "1px solid var(--cds-border-subtle)" }}>
                <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
                  {cause.pctOfHours}% of project hours
                </p>
                <p className="cds--type-productive-heading-02" style={{ marginTop: "0.25rem", color: "var(--cds-support-warning)" }}>
                  {Math.round(cause.hours)} hrs · {formatInr(cause.cost ?? 0)}
                </p>
              </div>
            ) : (
              <p className="cds--type-label-01" style={{ marginTop: "0.875rem", paddingTop: "0.75rem", borderTop: "1px solid var(--cds-border-subtle)", color: "var(--cds-text-placeholder)" }}>
                Budget-overrun pattern — not a share of hours worked
              </p>
            )}
          </Tile>
        ))}
      </div>

      <div
        style={{
          marginTop: "1.5rem",
          border: "1px solid var(--cds-border-subtle)",
          borderLeft: "3px solid var(--cds-support-warning)",
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
  );
}
