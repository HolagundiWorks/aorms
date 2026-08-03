import { Button, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { useState } from "react";
import type { EomsRulesResponse, EomsSource, EomsVersion } from "@esti/contracts";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { StatusDot } from "../carbon/adapters/index.js";
import { EOMS } from "../lib/product-nomenclature.js";
import { trpc } from "../lib/trpc.js";

/**
 * Read-only window onto the local EOMS compliance Knowledge Bank.
 * Fail-safe: when EOMS is down/disabled, shows a quiet offline state — never errors.
 * Wave 3 (Carbon). Docs: docs/esti/EOMS-INTEGRATION.md
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
    <CarbonScope>
      <div style={{ borderBottom: "1px solid var(--cds-border-subtle)", paddingBottom: "1rem", marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <h3 className="cds--type-heading-compact-01" style={{ flex: 1, margin: 0 }}>
            {EOMS.name} compliance bank
          </h3>
          {statusQ.isLoading ? (
            <span className="esti-label esti-label--secondary">Checking…</span>
          ) : offline ? (
            <StatusDot color="gray" label="Offline" size="md" />
          ) : (
            <StatusDot color="green" label="Connected" size="md" />
          )}
          <Button kind="ghost" size="sm" onClick={() => statusQ.refetch()} disabled={statusQ.isFetching}>
            Refresh
          </Button>
        </div>

        {offline ? (
          <InlineNotification
            kind="info"
            lowContrast
            hideCloseButton
            title="Compliance bank offline"
            subtitle={offline}
          />
        ) : (
          <Stack gap={4}>
            <span className="esti-label esti-label--secondary">
              Published editions only — resolve a code, then browse machine-evaluable rules.
            </span>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ minWidth: 220 }}>
                <Select
                  id="eoms-source"
                  labelText="Source"
                  size="sm"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  disabled={sourcesQ.isLoading || sources.length === 0}
                  helperText={sourceHelper}
                >
                  <SelectItem value="" text="Select a code…" />
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id} text={`${s.id}${s.title ? ` — ${s.title}` : ""}`} />
                  ))}
                </Select>
              </div>
              <div>
                <TextInput
                  id="eoms-as-of"
                  labelText="As of (optional)"
                  type="date"
                  size="sm"
                  value={asOf}
                  onChange={(e) => setAsOf(e.target.value)}
                />
              </div>
              <div>
                <TextInput
                  id="eoms-param"
                  labelText="Rule param filter"
                  size="sm"
                  placeholder="e.g. cover"
                  value={param}
                  onChange={(e) => setParam(e.target.value)}
                  disabled={!versionId}
                />
              </div>
            </div>

            {resolveFail && (
              <InlineNotification kind="warning" lowContrast hideCloseButton title="Couldn't resolve" subtitle={resolveFail} />
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
              <InlineNotification kind="warning" lowContrast hideCloseButton title="Rules unavailable" subtitle={rulesFail} />
            )}
            {rules.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: "1rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {rules.slice(0, 12).map((r) => (
                  <li key={r.id} className="cds--type-body-02">
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
    </CarbonScope>
  );
}
