"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { generateFeasibilityReport } from "../../lib/actions/feasibility";

export function GenerateFeasibilityButton({ projectId }: { projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await generateFeasibilityReport(projectId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <Button size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "Generating…" : "Generate feasibility report"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.5rem" }}>
          <InlineNotification kind="error" title="Could not generate" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
