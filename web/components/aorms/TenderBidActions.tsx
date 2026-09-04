"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { awardTender, closeTender } from "../../lib/actions/tenders";

export function CloseTenderButton({ tenderId }: { tenderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await closeTender(tenderId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <Button size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Closing…" : "Close tender"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not close" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}

export function AwardTenderButton({ tenderId, contractorId }: { tenderId: string; contractorId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await awardTender(tenderId, contractorId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Awarding…" : "Award"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not award" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
