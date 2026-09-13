"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { createClientRecord, type ClientActionState } from "../../lib/actions/clients";
import { FormGrid } from "./FormGrid";

export function NewClientForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState<ClientActionState, FormData>(
    createClientRecord,
    null,
  );
  // "Contact person" only makes sense once the client isn't a person
  // itself (migration 0044) — an INDIVIDUAL client IS the contact, a
  // COMPANY/ARCHITECT_FIRM client needs a named point of contact
  // separate from the organization's own name/email/phone.
  const [kind, setKind] = useState("INDIVIDUAL");

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
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <Select
            id="kind"
            name="kind"
            labelText="Type"
            defaultValue="INDIVIDUAL"
            onChange={(e) => setKind(e.target.value)}
          >
            <SelectItem value="INDIVIDUAL" text="Individual" />
            <SelectItem value="COMPANY" text="Company" />
            <SelectItem value="ARCHITECT_FIRM" text="Architect firm" />
          </Select>
          <TextInput id="city" name="city" labelText="City" />
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="phone" name="phone" labelText="Phone" />
          {kind !== "INDIVIDUAL" && (
            <TextInput
              id="contactPerson"
              name="contactPerson"
              labelText="Primary contact"
              placeholder="Who to actually reach at this organization"
            />
          )}
        </FormGrid>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't create client" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" renderIcon={Add} disabled={pending}>
          {pending ? "Creating…" : "Create client"}
        </Button>
      </Stack>
    </Form>
  );
}
