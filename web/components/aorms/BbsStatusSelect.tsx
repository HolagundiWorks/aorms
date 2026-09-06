"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateBbsStatus } from "../../lib/actions/bbs";

const STATUSES = ["DRAFT", "ISSUED"] as const;

export function BbsStatusSelect({ bbsId, status }: { bbsId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`bbs-status-${bbsId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as "DRAFT" | "ISSUED";
        startTransition(() => {
          void updateBbsStatus(bbsId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
