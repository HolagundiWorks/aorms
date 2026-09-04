"use client";

import { useTransition } from "react";
import { Select, SelectItem } from "@carbon/react";
import { updateJobApplicationStatus } from "../../lib/actions/job-applications";

const STATUSES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"];

export function JobApplicationStatusSelect({ applicationId, status }: { applicationId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      id={`job-app-status-${applicationId}`}
      labelText=""
      hideLabel
      size="sm"
      value={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void updateJobApplicationStatus(applicationId, next);
        });
      }}
    >
      {STATUSES.map((s) => (
        <SelectItem key={s} value={s} text={s} />
      ))}
    </Select>
  );
}
