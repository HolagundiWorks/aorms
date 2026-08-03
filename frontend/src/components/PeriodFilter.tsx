import { Select, SelectItem, TextInput } from "@carbon/react";
import type { PeriodFilterInput, PeriodPreset } from "@esti/contracts";
import { financialYear } from "@esti/contracts";
import { CarbonScope } from "../carbon/CarbonScope.js";

type Props = {
  value: PeriodFilterInput;
  onChange: (next: PeriodFilterInput) => void;
  /** `rail` — vertical stack, full-width fields for the 20% glass rail. */
  layout?: "inline" | "rail";
};

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: "CURRENT_FY", label: "Current FY" },
  { id: "PREVIOUS_FY", label: "Previous FY" },
  { id: "QUARTER", label: "FY quarter" },
  { id: "MONTH", label: "Month" },
  { id: "ASSESSMENT_YEAR", label: "Assessment year (TDS)" },
  { id: "CUSTOM", label: "Custom range" },
];

export function PeriodFilter({ value, onChange, layout = "inline" }: Props) {
  const preset = value.preset ?? "CURRENT_FY";
  const currentFy = financialYear();
  const rail = layout === "rail";
  const field = (min: number): React.CSSProperties => (rail ? { width: "100%" } : { minWidth: min });

  return (
    <CarbonScope>
      <div
        style={{
          display: "flex",
          flexDirection: rail ? "column" : "row",
          gap: rail ? "0.5rem" : "1rem",
          flexWrap: rail ? "nowrap" : "wrap",
          alignItems: rail ? "stretch" : "flex-end",
          minWidth: 0,
          width: "100%",
        }}
      >
        <div style={field(180)}>
          <Select
            id="period-preset"
            labelText="Period"
            size="sm"
            value={preset}
            onChange={(e) => onChange({ ...value, preset: e.target.value as PeriodPreset })}
          >
            {PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.label} />
            ))}
          </Select>
        </div>

        {(preset === "FY" || preset === "QUARTER") && (
          <div style={field(140)}>
            <Select
              id="period-fy"
              labelText="Financial year"
              size="sm"
              value={value.fy ?? currentFy}
              onChange={(e) => onChange({ ...value, fy: e.target.value })}
            >
              {[0, -1, -2].map((off) => {
                const y = Number(currentFy.slice(0, 4)) + off;
                const fy = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
                return <SelectItem key={fy} value={fy} text={`FY ${fy}`} />;
              })}
            </Select>
          </div>
        )}

        {preset === "QUARTER" && (
          <div style={field(100)}>
            <Select
              id="period-q"
              labelText="Quarter"
              size="sm"
              value={value.quarter ?? "Q1"}
              onChange={(e) =>
                onChange({ ...value, quarter: e.target.value as PeriodFilterInput["quarter"] })
              }
            >
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <SelectItem key={q} value={q} text={q} />
              ))}
            </Select>
          </div>
        )}

        {preset === "MONTH" && (
          <div style={rail ? { width: "100%" } : undefined}>
            <TextInput
              id="period-month"
              type="month"
              labelText="Month"
              size="sm"
              value={value.month ?? ""}
              onChange={(e) => onChange({ ...value, month: e.target.value })}
            />
          </div>
        )}

        {preset === "ASSESSMENT_YEAR" && (
          <div style={field(180)}>
            <Select
              id="period-ay"
              labelText="Assessment year ending"
              size="sm"
              value={String(value.assessmentYear ?? new Date().getFullYear())}
              onChange={(e) => onChange({ ...value, assessmentYear: Number(e.target.value) })}
            >
              {[0, 1, 2].map((off) => {
                const y = new Date().getFullYear() + off;
                return <SelectItem key={y} value={String(y)} text={`Mar ${y}`} />;
              })}
            </Select>
          </div>
        )}

        {preset === "CUSTOM" && (
          <>
            <div style={rail ? { width: "100%" } : undefined}>
              <TextInput
                id="period-from"
                type="date"
                labelText="From"
                size="sm"
                value={value.fromDate ?? ""}
                onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
              />
            </div>
            <div style={rail ? { width: "100%" } : undefined}>
              <TextInput
                id="period-to"
                type="date"
                labelText="To"
                size="sm"
                value={value.toDate ?? ""}
                onChange={(e) => onChange({ ...value, toDate: e.target.value })}
              />
            </div>
          </>
        )}
      </div>
    </CarbonScope>
  );
}
