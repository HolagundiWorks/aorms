"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateEngagementStatus } from "../../lib/actions/consultants";

const STATUSES = ["ENGAGED", "COMPLETED", "TERMINATED"];

export function EngagementStatusSelect({
  engagementId,
  consultantId,
  status,
}: {
  engagementId: string;
  consultantId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`engagement-status-${engagementId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateEngagementStatus(engagementId, consultantId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
