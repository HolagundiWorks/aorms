"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { UserFollow } from "@carbon/icons-react";
import { addCompanyContact } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { FormGrid } from "../../FormGrid";

export function AddCompanyContactForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(addCompanyContact, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={4}>
        <FormGrid>
          <TextInput id="company-contact-full-name" name="fullName" labelText="Full name" required />
          <TextInput id="company-contact-role-title" name="roleTitle" labelText="Role / title" placeholder="e.g. Authorized signatory" />
          <TextInput id="company-contact-email" name="email" labelText="Email" type="email" />
          <TextInput id="company-contact-phone" name="phone" labelText="Phone" />
        </FormGrid>
        <Checkbox id="company-contact-is-primary" name="isPrimary" labelText="Primary contact" />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't add" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={UserFollow} disabled={pending}>
          {pending ? "Adding…" : "Add contact"}
        </Button>
      </Stack>
    </Form>
  );
}
