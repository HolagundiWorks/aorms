"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { addCompanyBoardMember } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { FormGrid } from "../../FormGrid";

export function AddCompanyBoardMemberForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(addCompanyBoardMember, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={4}>
        <FormGrid>
          <TextInput id="company-board-full-name" name="fullName" labelText="Full name" required />
          <TextInput id="company-board-designation" name="designation" labelText="Designation" placeholder="e.g. Managing Director" />
          <TextInput id="company-board-din" name="din" labelText="DIN" placeholder="Director Identification Number" />
          <TextInput id="company-board-appointed-at" name="appointedAt" labelText="Appointed on" type="date" />
        </FormGrid>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't add" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={UserFollow} disabled={pending}>
          {pending ? "Adding…" : "Add board member"}
        </Button>
      </Stack>
    </Form>
  );
}
