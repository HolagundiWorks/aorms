"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateMomActionStatus } from "../../lib/actions/moms";

const STATUSES = ["OPEN", "IN_PROGRESS", "DONE"];

export function MomActionStatusSelect({ actionId, momId, status }: { actionId: string; momId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`mom-action-status-${actionId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateMomActionStatus(actionId, momId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s.replace(/_/g, " ")} />
      ))}
    </Select>
  );
}
