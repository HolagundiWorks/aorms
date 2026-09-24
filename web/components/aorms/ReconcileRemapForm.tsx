"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Stack, TextInput } from "@carbon/react";
import { setReconcileColumnMapping } from "../../lib/actions/reconcile";
import { FormGrid } from "./FormGrid";

/** Small remap form — only shown for a FAILED batch (its own file is
 * already in Storage; this just re-parses it with an explicit column
 * mapping instead of re-uploading). Not a native <Form action> because
 * setReconcileColumnMapping() takes a plain object, not FormData — same
 * class of bound-action Client Component as MomActionStatusSelect.tsx. */
export function ReconcileRemapForm({ reconcileId }: { reconcileId: string }) {
  const [mapDate, setMapDate] = useState("");
  const [mapDescription, setMapDescription] = useState("");
  const [mapAmount, setMapAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await setReconcileColumnMapping(reconcileId, {
        date: mapDate || undefined,
        description: mapDescription || undefined,
        amount: mapAmount || undefined,
      });
      if (res.error) setError(res.error);
    });
  }

  return (
    <Stack gap={4}>
      {error && <InlineNotification kind="error" title="Could not remap columns" subtitle={error} hideCloseButton lowContrast />}
      <FormGrid>
        <TextInput
          id={`remap-date-${reconcileId}`}
          labelText="Date column"
          value={mapDate}
          onChange={(e) => setMapDate(e.target.value)}
        />
        <TextInput
          id={`remap-desc-${reconcileId}`}
          labelText="Description column"
          value={mapDescription}
          onChange={(e) => setMapDescription(e.target.value)}
        />
        <TextInput
          id={`remap-amount-${reconcileId}`}
          labelText="Amount column"
          value={mapAmount}
          onChange={(e) => setMapAmount(e.target.value)}
        />
      </FormGrid>
      <Button size="sm" disabled={isPending} onClick={submit}>
        {isPending ? "Re-matching…" : "Remap & re-match"}
      </Button>
    </Stack>
  );
}
