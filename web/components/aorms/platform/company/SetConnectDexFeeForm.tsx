"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { adminSetConnectDexFee, type ConnectDexActionState } from "../../../../lib/actions/connectdex";

/** Mirrors SetPricingForm.tsx's pattern exactly — rupees in the input,
 * paise server-side; `key`'d by the caller since this is an
 * uncontrolled input. */
export function SetConnectDexFeeForm({ feePaise }: { feePaise: number }) {
  const [state, formAction, pending] = useActionState<ConnectDexActionState, FormData>(adminSetConnectDexFee, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput
          id="connectdex-fee"
          name="feeRupees"
          labelText="Flat onboarding fee (₹)"
          type="number"
          min={1}
          step="0.01"
          defaultValue={String(feePaise / 100)}
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save fee"}
        </Button>
      </Stack>
    </Form>
  );
}
