"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { setNegotiationOutcome } from "../../lib/actions/negotiation";

const OUTCOMES = ["ONGOING", "AGREED", "STALLED", "WITHDRAWN"];

export function NegotiationOutcomeSelect({
  projectId,
  negotiationId,
  outcome,
}: {
  projectId: string;
  negotiationId: string;
  outcome: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`negotiation-outcome-${negotiationId}`}
        labelText=""
        hideLabel
        size="sm"
        value={outcome}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          startTransition(async () => {
            const res = await setNegotiationOutcome(projectId, negotiationId, next);
            if (res.error) setError(res.error);
          });
        }}
      >
        {OUTCOMES.map((o) => (
          <SelectItem key={o} value={o} text={o} />
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
