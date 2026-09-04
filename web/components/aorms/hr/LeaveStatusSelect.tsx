"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateLeaveStatus } from "../../../lib/actions/hr";

const STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "CANCELLED"];

export function LeaveStatusSelect({ memberId, leaveId, status }: { memberId: string; leaveId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`leave-status-${leaveId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateLeaveStatus(memberId, leaveId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
