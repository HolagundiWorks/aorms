import { Stack, Typography } from "@mui/material";
import { formatINR, type PeriodFilterInput } from "@esti/contracts";
import { StatusDot } from "../../carbon/adapters/index.js";
import { PeriodFilter } from "../PeriodFilter.js";
import { trpc } from "../../lib/trpc.js";

const SUBTLE = "1px solid var(--cds-border-subtle)";
const SECONDARY = { color: "var(--cds-text-secondary)" } as const;

/**
 * Financial-year bar for the accounts rail — period selector plus carried-forward
 * summaries. Single-column for the rail.
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
    <Stack spacing={2} sx={{ minWidth: 0, width: "100%" }}>
      <PeriodFilter layout="rail" value={period} onChange={onPeriodChange} />

      <div style={{ padding: "0.5rem 0", borderTop: SUBTLE, borderBottom: SUBTLE }}>
        <Stack spacing={1}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <StatusDot color="teal" label="Running" />
            <Typography variant="caption" sx={SECONDARY}>
              Running projects
            </Typography>
          </div>
          <Typography variant="body2" sx={{ m: 0, wordBreak: "break-word" }}>
            {cf ? `${cf.runningCount} active / on-hold` : "—"}
          </Typography>
          <Typography variant="caption" sx={{ ...SECONDARY, wordBreak: "break-word" }}>
            Contract value: {cf ? formatINR(cf.runningContractPaise) : "—"}
          </Typography>
        </Stack>
      </div>

      <div style={{ padding: "0.5rem 0", borderBottom: SUBTLE }}>
        <Stack spacing={1}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <StatusDot color="magenta" label="Receivables" />
            <Typography variant="caption" sx={SECONDARY}>
              Prior-year receivables
            </Typography>
          </div>
          <Typography variant="body2" sx={{ m: 0, wordBreak: "break-word" }}>
            {cf ? formatINR(cf.priorReceivablePaise) : "—"}
          </Typography>
          <Typography variant="caption" sx={{ ...SECONDARY, wordBreak: "break-word" }}>
            {cf ? `${cf.priorReceivableCount} unpaid invoice(s) from closed projects` : "—"}
          </Typography>
        </Stack>
      </div>

      {cf && cf.priorReceivables.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="caption" sx={SECONDARY}>
            Prior receivables
          </Typography>
          {cf.priorReceivables.map((r) => (
            <div key={r.id} style={{ padding: "0.5rem 0", borderBottom: SUBTLE, minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, wordBreak: "break-word", display: "block" }}>
                {r.ref}
              </Typography>
              <Typography variant="caption" sx={{ ...SECONDARY, display: "block", wordBreak: "break-word" }}>
                {r.projectTitle}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                {formatINR(r.netReceivablePaise ?? 0)}
              </Typography>
            </div>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
