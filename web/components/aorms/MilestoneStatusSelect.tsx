"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateMilestoneStatus } from "../../lib/actions/pmc-milestones";

const STATUSES = ["PLANNED", "ON_TRACK", "AT_RISK", "DELAYED", "COMPLETE"];

export function MilestoneStatusSelect({ milestoneId, status }: { milestoneId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`milestone-status-${milestoneId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateMilestoneStatus(milestoneId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
