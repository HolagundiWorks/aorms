"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";

/** Generic "delete this line item" button — used by PO items, transmittal
 * items, and MoM actions, each passing their own bound Server Action. */
export function RemoveLineItemButton({ action }: { action: () => Promise<{ error?: string }> }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Button
        size="sm"
        kind="danger--ghost"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await action();
            if (res.error) setError(res.error);
          });
        }}
      >
        {isPending ? "Removing…" : "Remove"}
      </Button>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
