"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { leaveStudio } from "../../../lib/actions/platform";

export function LeaveStudioButton({ membershipId, studioName }: { membershipId: string; studioName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        kind="danger--tertiary"
        size="sm"
        renderIcon={TrashCan}
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Leave ${studioName}? You can rejoin later with its AORMS-S- handle.`)) return;
          setError(null);
          startTransition(async () => {
            const res = await leaveStudio(membershipId);
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Leaving…" : "Leave"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
