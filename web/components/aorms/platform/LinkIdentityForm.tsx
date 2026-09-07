"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Link } from "@carbon/icons-react";
import { linkPlatformIdentity, type PlatformActionState } from "../../../lib/actions/platform";

/**
 * `knownHandle` is set when the visitor already has an active AORMS
 * Platform session in this browser tab (identity/page.tsx checked) — in
 * that case the handle is pre-filled and read-only, one click to link. Not
 * set (undefined) means no platform session was detected, so this renders
 * a plain text field for typing a handle in from elsewhere.
 */
export function LinkIdentityForm({ knownHandle }: { knownHandle?: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(linkPlatformIdentity, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput
          id="handle"
          name="handle"
          labelText="AORMS-U- handle"
          defaultValue={knownHandle}
          readOnly={!!knownHandle}
          placeholder="AORMS-U-XXXX"
          required
        />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't link" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={Link} disabled={pending}>
          {pending ? "Linking…" : "Link this identity"}
        </Button>
      </Stack>
    </Form>
  );
}
