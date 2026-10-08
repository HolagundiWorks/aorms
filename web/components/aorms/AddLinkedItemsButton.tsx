"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification } from "@carbon/react";
import { addLinkedItems, type DeriveActionState } from "../../lib/actions/estimates";

export function AddLinkedItemsButton({ estimateId, count }: { estimateId: string; count: number }) {
  const [state, action, pending] = useActionState<DeriveActionState, FormData>(addLinkedItems, null);
  return (
    <Form action={action}>
      <input type="hidden" name="estimateId" value={estimateId} />
      {state && ("error" in state ? <InlineNotification kind="error" title={state.error} hideCloseButton lowContrast /> : <InlineNotification kind="success" title={state.ok} hideCloseButton lowContrast />)}
      <Button type="submit" size="sm" kind="tertiary" disabled={pending || count === 0}>
        {pending ? "Adding…" : `Add ${count} linked item${count === 1 ? "" : "s"}`}
      </Button>
    </Form>
  );
}
