"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { setOpportunityStatus } from "../../lib/actions/project-precon";

const STATUSES = ["OPEN", "IN_PROGRESS", "REALIZED", "CLOSED"];

export function OpportunityStatusSelect({ projectId, opportunityId, status }: { projectId: string; opportunityId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`opportunity-status-${opportunityId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void setOpportunityStatus(projectId, opportunityId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
