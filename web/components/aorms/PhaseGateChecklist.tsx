"use client";

import { useState, useTransition } from "react";
import { Button, Checkbox, InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { upsertPhaseGate } from "../../lib/actions/project-precon";
import { CONSULTANCY_PHASE_GATE_CHECKLIST, type ConsPhaseGateDecision } from "../../lib/project-precon";

const GATE_KEYS = ["CONCEPT", "SCHEMATIC", "DETAILED", "ISSUE_READINESS"];
const GATE_LABELS: Record<string, string> = {
  CONCEPT: "Concept",
  SCHEMATIC: "Schematic",
  DETAILED: "Detailed design",
  ISSUE_READINESS: "Issue readiness",
};

type GateRow = {
  gate_key: string;
  checklist: Record<string, boolean>;
  decision: string;
  notes: string | null;
  decided_by_name: string | null;
};

export function PhaseGateChecklist({ projectId, gates }: { projectId: string; gates: GateRow[] }) {
  const byKey = new Map(gates.map((g) => [g.gate_key, g]));

  return (
    <Stack gap={6}>
      {GATE_KEYS.map((key) => (
        <GateCard key={key} projectId={projectId} gateKey={key} row={byKey.get(key)} />
      ))}
    </Stack>
  );
}

function GateCard({ projectId, gateKey, row }: { projectId: string; gateKey: string; row?: GateRow }) {
  const [checklist, setChecklist] = useState<Record<string, boolean>>(row?.checklist ?? {});
  const [decision, setDecision] = useState<ConsPhaseGateDecision>((row?.decision as ConsPhaseGateDecision) ?? "PENDING");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await upsertPhaseGate(projectId, gateKey, decision, checklist, null);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ borderLeft: "3px solid var(--cds-border-subtle)", paddingLeft: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
        <p className="cds--type-heading-03">{GATE_LABELS[gateKey]}</p>
        <Select
          id={`gate-decision-${gateKey}`}
          labelText=""
          hideLabel
          size="sm"
          value={decision}
          onChange={(e) => setDecision(e.target.value as ConsPhaseGateDecision)}
        >
          <SelectItem value="PENDING" text="Pending" />
          <SelectItem value="GO" text="Go" />
          <SelectItem value="HOLD" text="Hold" />
          <SelectItem value="NO_GO" text="No-go" />
        </Select>
        {row?.decided_by_name && (
          <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            Decided by {row.decided_by_name}
          </span>
        )}
      </div>
      {CONSULTANCY_PHASE_GATE_CHECKLIST.map((item) => (
        <Checkbox
          key={item.key}
          id={`gate-${gateKey}-${item.key}`}
          labelText={item.label}
          checked={!!checklist[item.key]}
          onChange={(_e, { checked }) => setChecklist((c) => ({ ...c, [item.key]: checked }))}
        />
      ))}
      <Button size="sm" disabled={isPending} onClick={handleSave} style={{ marginTop: "0.5rem" }}>
        {isPending ? "Saving…" : "Save gate"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not save" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
