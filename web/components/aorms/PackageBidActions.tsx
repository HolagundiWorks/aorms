"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { awardPackage, openPackageBids } from "../../lib/actions/pmc-packages";

export function OpenBidsButton({ packageId }: { packageId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await openPackageBids(packageId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ marginBottom: "1rem" }}>
      <Button size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Opening…" : "Open bids"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not open bids" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}

export function AwardBidButton({
  packageId,
  bidId,
  contractorId,
}: {
  packageId: string;
  bidId: string;
  contractorId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await awardPackage(packageId, bidId, contractorId);
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
