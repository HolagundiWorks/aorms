"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { joinCompany, type PlatformActionState } from "../../../lib/actions/platform";

export function JoinCompanyForm() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(joinCompany, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput id="join-handle" name="handle" labelText="Company's AORMS-C- handle" placeholder="AORMS-C-XXXX" required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't join" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={UserFollow} disabled={pending}>
          {pending ? "Joining…" : "Join company"}
        </Button>
      </Stack>
    </Form>
  );
}
