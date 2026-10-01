"use client";

import { useActionState, useTransition } from "react";
import { Button, InlineNotification, Stack, TextArea } from "@carbon/react";
import { closeQuote, respondToQuote, type QuoteActionState } from "../../../lib/actions/quotes";

/** Reply / close controls on a quote request in the company owner's inbox. */
export function QuoteReplyForm({ id, replied }: { id: string; replied: boolean }) {
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(respondToQuote, null);
  const [closing, startClose] = useTransition();
  return (
    <form action={formAction}>
      <Stack gap={3}>
        <input type="hidden" name="id" value={id} />
        <TextArea id={`reply-${id}`} name="reply" labelText={replied ? "Send another reply" : "Your reply"} rows={3} maxCount={2000} required />
        {state && "error" in state && <InlineNotification kind="error" title="Not sent" subtitle={state.error} lowContrast hideCloseButton />}
        {state && "success" in state && <InlineNotification kind="success" title="Sent" subtitle={state.success} lowContrast hideCloseButton />}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sending…" : "Send reply"}
          </Button>
          <Button kind="ghost" size="sm" disabled={closing} onClick={() => startClose(async () => void (await closeQuote(id)))}>
            Close request
          </Button>
        </div>
      </Stack>
    </form>
  );
}
