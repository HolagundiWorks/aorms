"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { completeTask } from "../../lib/actions/collab-portal";

export function CollabTaskCompleteButton({ submissionId, projectId }: { submissionId: string; projectId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        kind="ghost"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await completeTask(submissionId, projectId);
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Marking done…" : "Mark complete"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
