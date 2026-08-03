import { Stack } from "@carbon/react";
import { formatINR, type PeriodFilterInput } from "@esti/contracts";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { StatusDot } from "../../carbon/adapters/index.js";
import { PeriodFilter } from "../PeriodFilter.js";
import { trpc } from "../../lib/trpc.js";

const SUBTLE = "1px solid var(--cds-border-subtle)";
const SECONDARY = { color: "var(--cds-text-secondary)" } as const;

/**
 * Financial-year bar for the accounts rail — period selector plus carried-forward
 * summaries. Single-column for the rail. Wave 3 (Carbon).
 */
export function AccountsCarryForward({
  period,
  onPeriodChange,
}: {
  period: PeriodFilterInput;
  onPeriodChange: (next: PeriodFilterInput) => void;
}) {
  const cfQ = trpc.accounts.carryForward.useQuery(period);
  const cf = cfQ.data;

  return (
    <CarbonScope>
      <Stack gap={4} style={{ minWidth: 0, width: "100%" }}>
        <PeriodFilter layout="rail" value={period} onChange={onPeriodChange} />

        <div style={{ padding: "0.5rem 0", borderTop: SUBTLE, borderBottom: SUBTLE }}>
          <Stack gap={2}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <StatusDot color="teal" label="Running" />
              <span className="cds--type-caption-01" style={SECONDARY}>Running projects</span>
            </div>
            <p className="cds--type-body-01" style={{ margin: 0, wordBreak: "break-word" }}>
              {cf ? `${cf.runningCount} active / on-hold` : "—"}
            </p>
            <span className="cds--type-caption-01" style={{ ...SECONDARY, wordBreak: "break-word" }}>
              Contract value: {cf ? formatINR(cf.runningContractPaise) : "—"}
            </span>
          </Stack>
        </div>

        <div style={{ padding: "0.5rem 0", borderBottom: SUBTLE }}>
          <Stack gap={2}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <StatusDot color="magenta" label="Receivables" />
              <span className="cds--type-caption-01" style={SECONDARY}>Prior-year receivables</span>
            </div>
            <p className="cds--type-body-01" style={{ margin: 0, wordBreak: "break-word" }}>
              {cf ? formatINR(cf.priorReceivablePaise) : "—"}
            </p>
            <span className="cds--type-caption-01" style={{ ...SECONDARY, wordBreak: "break-word" }}>
              {cf ? `${cf.priorReceivableCount} unpaid invoice(s) from closed projects` : "—"}
            </span>
          </Stack>
        </div>

        {cf && cf.priorReceivables.length > 0 && (
          <Stack gap={2}>
            <span className="cds--type-label-01" style={SECONDARY}>Prior receivables</span>
            {cf.priorReceivables.map((r) => (
              <div key={r.id} style={{ padding: "0.5rem 0", borderBottom: SUBTLE, minWidth: 0 }}>
                <span className="cds--type-label-01" style={{ fontWeight: 600, wordBreak: "break-word" }}>
                  {r.ref}
                </span>
                <span
                  className="cds--type-caption-01"
                  style={{ ...SECONDARY, display: "block", wordBreak: "break-word" }}
                >
                  {r.projectTitle}
                </span>
                <span className="cds--type-caption-01" style={{ display: "block" }}>
                  {formatINR(r.netReceivablePaise ?? 0)}
                </span>
              </div>
            ))}
          </Stack>
        )}
      </Stack>
    </CarbonScope>
  );
}
