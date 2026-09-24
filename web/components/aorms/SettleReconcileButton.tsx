"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { settleReconcileBatch } from "../../lib/actions/reconcile";

export function SettleReconcileButton({ reconcileId }: { reconcileId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        kind="tertiary"
        disabled={isPending}
        onClick={() => {
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const res = await settleReconcileBatch(reconcileId);
            if (res.error) {
              setError(res.error);
            } else {
              setMessage(
                `Settled ${res.settled ?? 0} of ${res.applied ?? 0} matched line(s) (${res.skipped ?? 0} skipped, ${res.alreadyApplied ?? 0} already applied).`,
              );
            }
          });
        }}
      >
        {isPending ? "Settling…" : "Settle"}
      </Button>
      {message && <InlineNotification kind="success" title="Settled" subtitle={message} hideCloseButton lowContrast />}
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
