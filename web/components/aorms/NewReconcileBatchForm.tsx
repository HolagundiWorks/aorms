"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, FileUploader, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { uploadReconcileBatch, type ReconcileActionState } from "../../lib/actions/reconcile";
import { FormGrid } from "./FormGrid";

const initialState: ReconcileActionState = null;

export function NewReconcileBatchForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(uploadReconcileBatch, initialState);

  const prevPending = useRef(pending);
  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      onSuccess?.();
    }
    prevPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not upload statement" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <TextInput id="label" name="label" labelText="Label" placeholder="e.g. HDFC current a/c — Sep 2026" required />
        <FileUploader
          id="file"
          name="file"
          labelTitle="Bank statement"
          labelDescription="CSV or Excel export from your bank — 10MB max."
          buttonLabel="Choose file"
          accept={[".csv", ".xlsx", ".xls"]}
          filenameStatus="edit"
        />
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)" }}>
          Optional column overrides — only needed if the statement&apos;s own headers aren&apos;t recognized automatically.
        </p>
        <FormGrid>
          <TextInput id="mapDate" name="mapDate" labelText="Date column" placeholder="e.g. Value Date" />
          <TextInput id="mapDescription" name="mapDescription" labelText="Description column" placeholder="e.g. Narration" />
          <TextInput id="mapAmount" name="mapAmount" labelText="Amount column" placeholder="e.g. Credit" />
        </FormGrid>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Upload & match"}
        </Button>
      </Stack>
    </Form>
  );
}
