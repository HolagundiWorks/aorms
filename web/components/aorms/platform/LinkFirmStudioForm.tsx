"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Link } from "@carbon/icons-react";
import { linkFirmToStudio, type PlatformActionState } from "../../../lib/actions/platform";

/**
 * Firm Settings' own studio link (2026-09-14) — deployment-wide, not
 * personal (LinkIdentityForm.tsx is the per-person equivalent). Gated by
 * RLS ("firm: owner/partner update"), same as every other Firm Settings
 * write on this page — this form doesn't check the role itself.
 */
export function LinkFirmStudioForm() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(linkFirmToStudio, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput id="handle" name="handle" labelText="AORMS-S- studio handle" placeholder="AORMS-S-XXXX" required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't link" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={Link} disabled={pending}>
          {pending ? "Linking…" : "Link this studio"}
        </Button>
      </Stack>
    </Form>
  );
}
