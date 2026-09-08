"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { issueMomRecord } from "../../lib/actions/moms";

/** DRAFT → ISSUED, the transition moms.ts never had a way to make (found
 * while wiring document_issues auto-logging — the client-portal RLS policy
 * already filtered on `moms(status = ISSUED)`, but nothing ever set it). */
export function IssueMomButton({ momId }: { momId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await issueMomRecord(momId);
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Issuing…" : "Issue"}
      </Button>
      {error && <InlineNotification kind="error" title="Couldn't issue" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
