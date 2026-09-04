import { Alert, AlertTitle, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import type { EomsRulesResponse, EomsSource, EomsVersion } from "@esti/contracts";
import { StatusDot } from "../carbon/adapters/index.js";
import { EOMS } from "../lib/product-nomenclature.js";
import { trpc } from "../lib/trpc.js";

/**
 * Read-only window onto the local EOMS compliance Knowledge Bank.
 * Fail-safe: when EOMS is down/disabled, shows a quiet offline state — never errors.
 * Docs: docs/esti/EOMS-INTEGRATION.md
 */
export function EomsCompliancePanel() {
  const statusQ = trpc.eoms.status.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const sourcesQ = trpc.eoms.sources.useQuery(undefined, {
    enabled: !!statusQ.data?.reachable,
    staleTime: 60_000,
  });

  const [sourceId, setSourceId] = useState("");
  const [asOf, setAsOf] = useState("");
  const [param, setParam] = useState("");

  const resolveQ = trpc.eoms.resolve.useQuery(
    { source: sourceId, asOf: asOf || undefined },
    { enabled: !!statusQ.data?.reachable && sourceId.length > 0, staleTime: 60_000 },
  );

  const versionId = resolveQ.data?.ok === true ? resolveQ.data.data.id : undefined;

  const rulesQ = trpc.eoms.rules.useQuery(
    { version: versionId!, param: param || undefined },
    {
      enabled: !!statusQ.data?.reachable && !!versionId,
      staleTime: 60_000,
    },
  );

  const status = statusQ.data;
  const offline = !status?.enabled
    ? `${EOMS.name} is not configured (set EOMS_API_URL).`
    : !status.reachable
      ? `${EOMS.name} is offline — start the local companion, then refresh.`
      : null;

  const sources: EomsSource[] = sourcesQ.data?.ok === true ? sourcesQ.data.data : [];
  const resolved: EomsVersion | null = resolveQ.data?.ok === true ? resolveQ.data.data : null;
  const resolveFail =
    resolveQ.data && resolveQ.data.ok === false ? `Could not resolve: ${resolveQ.data.reason}` : null;

  const rulesPayload: EomsRulesResponse | null = rulesQ.data?.ok === true ? rulesQ.data.data : null;
  const rules = rulesPayload?.results ?? [];
  const rulesCount = rulesPayload?.count ?? null;
  const rulesFail = rulesQ.data && rulesQ.data.ok === false ? `Rules: ${rulesQ.data.reason}` : null;

  const sourceHelper = sourcesQ.isLoading
    ? "Loading sources…"
    : sources.length === 0
      ? sourcesQ.data?.ok === false
        ? `Sources: ${sourcesQ.data.reason}`
        : "No published sources yet"
      : undefined;

  return (
    <div style={{ borderBottom: "1px solid var(--cds-border-subtle)", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Typography variant="subtitle2" sx={{ flex: 1, m: 0 }}>
          {EOMS.name} compliance bank
        </Typography>
        {statusQ.isLoading ? (
          <span className="esti-label esti-label--secondary">Checking…</span>
        ) : offline ? (
          <StatusDot color="gray" label="Offline" size="md" />
        ) : (
          <StatusDot color="green" label="Connected" size="md" />
        )}
        <Button size="small" variant="text" onClick={() => statusQ.refetch()} disabled={statusQ.isFetching}>
          Refresh
        </Button>
      </div>

      {offline ? (
        <Alert severity="info">
          <AlertTitle>Compliance bank offline</AlertTitle>
          {offline}
        </Alert>
      ) : (
        <Stack spacing={2}>
          <span className="esti-label esti-label--secondary">
            Published editions only — resolve a code, then browse machine-evaluable rules.
          </span>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
            <TextField
              id="eoms-source"
              select
              label="Source"
              size="small"
              sx={{ minWidth: 220 }}
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              disabled={sourcesQ.isLoading || sources.length === 0}
              helperText={sourceHelper}
            >
              <MenuItem value="">Select a code…</MenuItem>
              {sources.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {`${s.id}${s.title ? ` — ${s.title}` : ""}`}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              id="eoms-as-of"
              label="As of (optional)"
              type="date"
              size="small"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              id="eoms-param"
              label="Rule param filter"
              size="small"
              placeholder="e.g. cover"
              value={param}
              onChange={(e) => setParam(e.target.value)}
              disabled={!versionId}
            />
          </div>

          {resolveFail && (
            <Alert severity="warning">
              <AlertTitle>Couldn&apos;t resolve</AlertTitle>
              {resolveFail}
            </Alert>
          )}
          {resolved && (
            <span className="esti-label">
              Edition <strong>{resolved.id}</strong>
              {resolved.edition ? ` · ${resolved.edition}` : ""}
              {resolved.status ? ` · ${resolved.status}` : ""}
              {resolved.effective_from ? ` · from ${resolved.effective_from}` : ""}
              {rulesCount != null ? ` · ${rulesCount} rule${rulesCount === 1 ? "" : "s"}` : ""}
            </span>
          )}
          {rulesFail && (
            <Alert severity="warning">
              <AlertTitle>Rules unavailable</AlertTitle>
              {rulesFail}
            </Alert>
          )}
          {rules.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {rules.slice(0, 12).map((r) => (
                <li key={r.id}>
                  <strong>{r.type ?? "rule"}</strong>
                  {r.severity ? ` · ${r.severity}` : ""}
                  {r.text ? ` — ${r.text}` : ` (${r.id})`}
                </li>
              ))}
              {rules.length > 12 && (
                <span className="esti-label esti-label--secondary">…and {rules.length - 12} more</span>
              )}
            </ul>
          )}
        </Stack>
      )}
    </div>
  );
}
