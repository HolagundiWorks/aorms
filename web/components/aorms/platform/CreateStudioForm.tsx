"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { createStudio, type PlatformActionState } from "../../../lib/actions/platform";

export function CreateStudioForm() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(createStudio, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput id="studio-name" name="name" labelText="Studio name" placeholder="Acme Architects" required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't create studio" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={Add} disabled={pending}>
          {pending ? "Creating…" : "Create studio"}
        </Button>
      </Stack>
    </Form>
  );
}
