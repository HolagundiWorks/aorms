"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateSnagStatus } from "../../lib/actions/snags";

const STATUSES = ["OPEN", "IN_PROGRESS", "VERIFIED", "CLOSED"];

export function SnagStatusSelect({ snagId, status }: { snagId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`snag-status-${snagId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateSnagStatus(snagId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
