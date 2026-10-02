"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Popover, PopoverContent } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { recomputeNow } from "../../../lib/actions/pulse";

/**
 * On-demand trigger for the same recompute pass the bearer-secured cron
 * route runs every 15 minutes (lib/pulse/recompute.ts) — so verifying or
 * using Pulse never has to wait on the schedule.
 *
 * The result shows as a tooltip-style popover anchored to the button (2026-10-02) —
 * it used to be a full-width success banner that pushed the page down. It opens when
 * the run finishes, closes on outside click / Escape or after 10 s, and is announced
 * to screen readers via role="status".
 */
export function RecomputeButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 10_000);
    return () => clearTimeout(t);
  }, [open]);

  function run() {
    setMessage(null);
    setOpen(false);
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
      setOpen(true);
    });
  }

  return (
    <Popover open={open && !!message} onRequestClose={() => setOpen(false)} align="bottom-end" dropShadow caret>
      <Button kind="tertiary" size="sm" renderIcon={Renew} disabled={isPending} onClick={run}>
        {isPending ? "Recomputing…" : "Recompute now"}
      </Button>
      <PopoverContent>
        <div role="status" style={{ padding: "0.75rem 1rem", maxInlineSize: "20rem" }}>
          <p className="cds--type-label-01" style={{ fontWeight: 600, color: isError ? "var(--cds-support-error)" : "var(--cds-text-primary)" }}>
            {isError ? "Recompute failed" : "Recompute complete"}
          </p>
          <p className="cds--type-body-01" style={{ marginTop: "0.25rem" }}>
            {message}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
