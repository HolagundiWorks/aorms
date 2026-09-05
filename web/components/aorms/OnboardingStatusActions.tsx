"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { completeOnboarding, reopenOnboarding } from "../../lib/actions/onboarding";

export function OnboardingStatusActions({ projectId, status }: { projectId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding(projectId);
      if (res.error) setError(res.error);
    });
  }

  function handleReopen() {
    setError(null);
    startTransition(async () => {
      const res = await reopenOnboarding(projectId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {status === "COMPLETE" ? (
        <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleReopen}>
          {isPending ? "Working…" : "Reopen"}
        </Button>
      ) : (
        <Button size="sm" disabled={isPending} onClick={handleComplete}>
          {isPending ? "Working…" : "Mark complete"}
        </Button>
      )}
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not update" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
