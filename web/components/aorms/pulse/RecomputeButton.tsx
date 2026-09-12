"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { recomputeNow } from "../../../lib/actions/pulse";

/**
 * On-demand trigger for the same recompute pass the bearer-secured cron
 * route runs every 15 minutes (lib/pulse/recompute.ts) — so verifying or
 * using Pulse never has to wait on the schedule.
 */
export function RecomputeButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await recomputeNow();
      if (result?.error) {
        setIsError(true);
        setMessage(result.error);
      } else if (result?.summary) {
        setIsError(false);
        const s = result.summary;
        setMessage(
          `Scanned ${s.tasksScanned} open task${s.tasksScanned === 1 ? "" : "s"} — ${s.tasksChanged} score${s.tasksChanged === 1 ? "" : "s"} updated, ${s.missingParamsOpened} new gap${s.missingParamsOpened === 1 ? "" : "s"} flagged, ${s.missingParamsResolved} resolved.`,
        );
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
      <Button kind="tertiary" size="sm" renderIcon={Renew} disabled={isPending} onClick={run}>
        {isPending ? "Recomputing…" : "Recompute now"}
      </Button>
      {message && (
        <InlineNotification
          kind={isError ? "error" : "success"}
          title={isError ? "Recompute failed" : "Recompute complete"}
          subtitle={message}
          hideCloseButton
          lowContrast
          style={{ minWidth: "20rem" }}
        />
      )}
    </div>
  );
}
