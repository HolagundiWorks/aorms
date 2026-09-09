"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, TextInput } from "@carbon/react";
import { getMyCalendarFeedToken, rotateMyCalendarFeedToken } from "../../lib/actions/users";

/** Subscribe-by-URL calendar feed of the signed-in user's own open tasks
 * with due dates — shown only on the signed-in user's own row, same
 * placement convention as MyNameEditor. */
export function MyCalendarFeedButton() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function urlFromToken(token: string): string {
    return `${window.location.origin}/api/calendar/${token}.ics`;
  }

  function get() {
    setError(null);
    startTransition(async () => {
      const res = await getMyCalendarFeedToken();
      if (res.error) setError(res.error);
      else if (res.token) setUrl(urlFromToken(res.token));
    });
  }

  function rotate() {
    setError(null);
    startTransition(async () => {
      const res = await rotateMyCalendarFeedToken();
      if (res.error) setError(res.error);
      else if (res.token) setUrl(urlFromToken(res.token));
    });
  }

  if (url === null) {
    return (
      <div>
        <Button size="sm" kind="ghost" disabled={isPending} onClick={get}>
          {isPending ? "Getting…" : "Get calendar feed"}
        </Button>
        {error && <InlineNotification kind="error" title="Couldn't get feed" subtitle={error} hideCloseButton lowContrast />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxWidth: "24rem" }}>
      <p className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
        Subscribe to this URL in Google Calendar/Outlook (open tasks with due dates):
      </p>
      <TextInput id="calendar-feed-url" labelText="" hideLabel size="sm" value={url} readOnly onClick={(e) => (e.target as HTMLInputElement).select()} />
      <div>
        <Button size="sm" kind="tertiary" disabled={isPending} onClick={rotate}>
          {isPending ? "Rotating…" : "Rotate (invalidate old link)"}
        </Button>
      </div>
      {error && <InlineNotification kind="error" title="Couldn't rotate" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
