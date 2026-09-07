"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { updateLicence, type PlatformActionState } from "../../../lib/actions/platform";
import { FormGrid } from "../FormGrid";

type Licence = { plan: string; seats: number; expires_at: string | null };

export function UpdateLicenceForm({ companyId, licence }: { companyId: string; licence: Licence }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateLicence, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={4}>
        <FormGrid>
          <Select id="licence-plan" name="plan" labelText="Plan" defaultValue={licence.plan}>
            <SelectItem value="TRIAL" text="Trial" />
            <SelectItem value="STANDARD" text="Standard" />
            <SelectItem value="PREMIUM" text="Premium" />
          </Select>
          <TextInput id="licence-seats" name="seats" labelText="Seats" type="number" min={1} defaultValue={String(licence.seats)} />
          <TextInput
            id="licence-expires-at"
            name="expiresAt"
            labelText="Expires on (blank = no expiry)"
            type="date"
            defaultValue={licence.expires_at ? licence.expires_at.slice(0, 10) : ""}
          />
        </FormGrid>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Update licence"}
        </Button>
      </Stack>
    </Form>
  );
}
