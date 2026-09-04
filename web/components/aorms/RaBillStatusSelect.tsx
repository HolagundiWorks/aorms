"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { updateRaBillStatus } from "../../lib/actions/pmc-ra-bills";

const STATUSES = ["DRAFT", "SITE_CHECKED", "CERTIFIED", "SENT_TO_CLIENT", "CLOSED"];

export function RaBillStatusSelect({ billId, status }: { billId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`ra-bill-status-${billId}`}
        labelText=""
        hideLabel
        size="sm"
        value={status}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          startTransition(async () => {
            const res = await updateRaBillStatus(billId, next);
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
