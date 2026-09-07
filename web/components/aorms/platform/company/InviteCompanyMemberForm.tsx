"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { inviteCompanyMember } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";

export function InviteCompanyMemberForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(inviteCompanyMember, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={4}>
        <TextInput id="invite-company-handle" name="handle" labelText="Member's AORMS-U- handle" placeholder="AORMS-U-XXXX" required />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't invite" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={UserFollow} disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </Stack>
    </Form>
  );
}
