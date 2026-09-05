"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { setLeadStatus } from "../../lib/actions/leads";
import type { LeadStatus } from "../../lib/project-os";

const STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "ASSESSMENT_STARTED", "AWAITING_REVIEW", "QUALIFIED", "DROPPED", "LOST"];

export function LeadStatusSelect({ leadId, status, disabled }: { leadId: string; status: string; disabled?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`lead-status-${leadId}`}
        labelText=""
        hideLabel
        size="sm"
        value={status}
        disabled={isPending || disabled}
        onChange={(e) => {
          const next = e.target.value as LeadStatus;
          setError(null);
          startTransition(async () => {
            const res = await setLeadStatus(leadId, next);
            if (res.error) setError(res.error);
          });
        }}
      >
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} text={s} />
        ))}
      </Select>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not update" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
