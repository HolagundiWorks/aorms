"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateApprovalStatus } from "../../lib/actions/approvals";

const STATUSES = ["DRAFT", "SENT", "APPROVED", "REVISIONS", "REJECTED", "SUPERSEDED"];

export function ApprovalStatusSelect({ approvalId, status }: { approvalId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`approval-status-${approvalId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateApprovalStatus(approvalId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
