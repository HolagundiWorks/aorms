"use client";

/**
 * Today's Brief body — holds the displayed brief text as client state,
 * initialized from the server-rendered brief `TodaysBrief.tsx` already
 * generated at page load, with a small "Refresh" button that calls the
 * same generateDailyBrief() Server Action again (useTransition, same
 * shape as SendPasswordResetButton.tsx) when the data's moved on since
 * then. Named "Refresh" rather than "Body" since regenerating is the
 * only interactive behavior here — the initial render is fully
 * server-side, this just makes it re-askable.
 */
import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Renew } from "@carbon/icons-react";
import { generateDailyBrief } from "../../../lib/actions/daily-brief";

export function TodaysBriefRefresh({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <p className="cds--type-body-01">{text}</p>
      <div style={{ marginTop: "0.75rem" }}>
        <Button
          kind="ghost"
          size="sm"
          renderIcon={Renew}
          disabled={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await generateDailyBrief();
              if (res.error) setError(res.error);
              else setText(res.output);
            });
          }}
        >
          {isPending ? "Refreshing…" : "Refresh"}
        </Button>
      </div>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast style={{ marginTop: "0.5rem" }} />}
    </div>
  );
}
