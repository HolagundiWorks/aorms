"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { createCompany } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";

export function CreateCompanyForm() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(createCompany, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput id="company-name" name="name" labelText="Company name" placeholder="Acme Building Materials" required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't create company" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={Add} disabled={pending}>
          {pending ? "Creating…" : "Create company"}
        </Button>
      </Stack>
    </Form>
  );
}
