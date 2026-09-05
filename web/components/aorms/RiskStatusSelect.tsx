"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { setRiskStatus } from "../../lib/actions/project-precon";

const STATUSES = ["OPEN", "MITIGATED", "CLOSED"];

export function RiskStatusSelect({ projectId, riskId, status }: { projectId: string; riskId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`risk-status-${riskId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void setRiskStatus(projectId, riskId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
