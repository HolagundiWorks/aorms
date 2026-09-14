"use client";

/**
 * ROI Calculator (spec §13) — Client Component (needs live input state).
 * Formula uses exactly the three components the spec's OWN worked
 * example actually sums (fee recovery + management capacity + admin
 * effort = the total shown: ₹2,00,000 + ₹3,12,000 + ₹2,08,000 =
 * ₹7,20,000) — the spec's prose also lists a fourth "potential cash-flow
 * improvement" line, but that line never appears in its own worked
 * example and the spec gives no formula for it, so it's dropped here
 * rather than invented.
 *
 * `professionalPricePaise` is passed down from the Server Component
 * wrapper (RoiCalculatorSection.tsx), which reads it live from
 * `plan_pricing` — never hardcoded, so the value/cost multiplier stays
 * correct if an admin changes the price on /admin/pricing later.
 *
 * "Estimated fee leakage" (2026-09-14 follow-up) is no longer a manually
 * guessed 1/2/3/5% pill — it's `TOTAL_LEAKAGE_PCT`, the sum of
 * `OPERATIONAL_LEAKAGE.causes[].pctOfHours` from the breakdown shown just
 * above this calculator (`OperationalLeakageCalculator.tsx`), so the two
 * sections stay one calculation instead of two independently-guessed
 * numbers.
 */
import { useMemo, useState } from "react";
import { NumberInput, Stack, Tag } from "@carbon/react";
import { ROI_DISCLAIMER } from "../../../lib/marketing-content";
import { TOTAL_LEAKAGE_PCT } from "./OperationalLeakageCalculator";

function formatInr(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function RoiCalculator({ professionalPricePaise }: { professionalPricePaise: number }) {
  const [annualFees, setAnnualFees] = useState(10000000); // ₹1,00,00,000 default, matches the spec's own example
  const [mgmtHoursPerWeek, setMgmtHoursPerWeek] = useState(6);
  const [adminHoursPerWeek, setAdminHoursPerWeek] = useState(4);
  const [hourlyValue, setHourlyValue] = useState(1000);

  const { feeRecovery, managementRecovered, adminRecovered, potentialAnnualValue, multiplier } = useMemo(() => {
    const feeRecovery = annualFees * (TOTAL_LEAKAGE_PCT / 100);
    const managementRecovered = mgmtHoursPerWeek * 52 * hourlyValue;
    const adminRecovered = adminHoursPerWeek * 52 * hourlyValue;
    const potentialAnnualValue = feeRecovery + managementRecovered + adminRecovered;
    const professionalPriceRupees = professionalPricePaise / 100;
    const multiplier = professionalPriceRupees > 0 ? potentialAnnualValue / professionalPriceRupees : 0;
    return { feeRecovery, managementRecovered, adminRecovered, potentialAnnualValue, multiplier };
  }, [annualFees, mgmtHoursPerWeek, adminHoursPerWeek, hourlyValue, professionalPricePaise]);

  return (
    <div style={{ border: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)", padding: "1.5rem" }}>
      <Stack gap={5}>
        <NumberInput
          id="roi-annual-fees"
          label="Annual professional fees (₹)"
          value={annualFees}
          onChange={(_e, { value }) => setAnnualFees(Number(value) || 0)}
          min={0}
          step={100000}
          hideSteppers
        />

        <div>
          <p className="cds--type-label-01" style={{ marginBottom: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Estimated fee leakage
          </p>
          <p className="cds--type-heading-03">{TOTAL_LEAKAGE_PCT}%</p>
          <p className="cds--type-helper-text-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Calculated from the operational leakage breakdown above — not a manual guess.
          </p>
        </div>

        <NumberInput
          id="roi-mgmt-hours"
          label="Management hours lost per week"
          value={mgmtHoursPerWeek}
          onChange={(_e, { value }) => setMgmtHoursPerWeek(Number(value) || 0)}
          min={0}
          hideSteppers
        />

        <NumberInput
          id="roi-admin-hours"
          label="Administrative hours lost per week"
          value={adminHoursPerWeek}
          onChange={(_e, { value }) => setAdminHoursPerWeek(Number(value) || 0)}
          min={0}
          hideSteppers
        />

        <NumberInput
          id="roi-hourly-value"
          label="Internal hourly value (₹)"
          value={hourlyValue}
          onChange={(_e, { value }) => setHourlyValue(Number(value) || 0)}
          min={0}
          step={100}
          hideSteppers
        />

        <div style={{ borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "1.25rem" }}>
          <Stack gap={3}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                Potential fee recovery
              </span>
              <span className="cds--type-body-01">{formatInr(feeRecovery)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                Management capacity recovered
              </span>
              <span className="cds--type-body-01">{formatInr(managementRecovered)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                Administrative effort recovered
              </span>
              <span className="cds--type-body-01">{formatInr(adminRecovered)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "0.5rem", borderTop: "1px solid var(--cds-border-subtle)" }}>
              <span className="cds--type-productive-heading-02">Potential annual value</span>
              <span className="cds--type-productive-heading-02" style={{ color: "var(--cds-support-success)" }}>
                {formatInr(potentialAnnualValue)}
              </span>
            </div>
          </Stack>
        </div>

        {professionalPricePaise > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              AORMS Professional — {formatInr(professionalPricePaise / 100)}/year
            </span>
            <Tag type="green" size="md">
              {multiplier.toFixed(1)}× potential value / cost
            </Tag>
          </div>
        )}

        <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
          {ROI_DISCLAIMER}
        </p>
      </Stack>
    </div>
  );
}
