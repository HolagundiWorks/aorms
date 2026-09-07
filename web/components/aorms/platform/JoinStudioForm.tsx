"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { joinStudio, type PlatformActionState } from "../../../lib/actions/platform";

export function JoinStudioForm() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(joinStudio, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput id="join-handle" name="handle" labelText="Studio's AORMS-S- handle" placeholder="AORMS-S-XXXX" required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't join" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={UserFollow} disabled={pending}>
          {pending ? "Joining…" : "Join studio"}
        </Button>
      </Stack>
    </Form>
  );
}
