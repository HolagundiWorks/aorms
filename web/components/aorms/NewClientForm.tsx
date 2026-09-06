"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { createClientRecord, type ClientActionState } from "../../lib/actions/clients";
import { FormGrid } from "./FormGrid";

export function NewClientForm() {
  const [state, formAction, pending] = useActionState<ClientActionState, FormData>(
    createClientRecord,
    null,
  );

  return (
    <Form action={formAction} style={{ marginBottom: "2rem" }}>
      <Stack gap={5}>
        <h2 className="cds--type-heading-03">New client</h2>
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <Select id="kind" name="kind" labelText="Type" defaultValue="INDIVIDUAL">
            <SelectItem value="INDIVIDUAL" text="Individual" />
            <SelectItem value="COMPANY" text="Company" />
            <SelectItem value="ARCHITECT_FIRM" text="Architect firm" />
          </Select>
          <TextInput id="city" name="city" labelText="City" />
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="phone" name="phone" labelText="Phone" />
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
