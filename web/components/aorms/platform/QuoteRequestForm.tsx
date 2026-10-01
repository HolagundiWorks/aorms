"use client";

import { useActionState, useState } from "react";
import { Button, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { requestQuote, type QuoteActionState } from "../../../lib/actions/quotes";

/** "Request quote" on a Materials directory product — collapsed until opened. */
export function QuoteRequestForm({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<QuoteActionState, FormData>(requestQuote, null);

  if (!open) {
    return (
      <Button kind="tertiary" size="sm" onClick={() => setOpen(true)} aria-label={`Request a quote for ${productName}`}>
        Request quote
      </Button>
    );
  }
  return (
    <form action={formAction} style={{ minInlineSize: "18rem" }}>
      <Stack gap={4}>
        <input type="hidden" name="productId" value={productId} />
        <TextInput id={`q-qty-${productId}`} name="quantity" labelText="Quantity (optional)" placeholder="e.g. 200 bags, 450 m²" size="sm" />
        <TextArea id={`q-msg-${productId}`} name="message" labelText="What do you need?" rows={3} maxCount={2000} required />
        {state && "error" in state && <InlineNotification kind="error" title="Not sent" subtitle={state.error} lowContrast hideCloseButton />}
        {state && "success" in state && <InlineNotification kind="success" title="Sent" subtitle={state.success} lowContrast hideCloseButton />}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sending…" : "Send request"}
          </Button>
          <Button kind="ghost" size="sm" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </Stack>
    </form>
  );
}
