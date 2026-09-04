"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { issueProgressReport } from "../../lib/actions/progress-reports";

export function IssueProgressReportButton({ reportId }: { reportId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await issueProgressReport(reportId);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div>
      <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleClick}>
        {isPending ? "Issuing…" : "Issue"}
      </Button>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not issue" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
