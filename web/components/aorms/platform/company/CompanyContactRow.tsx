"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Checkbox, Form, InlineNotification, Stack, Tag, TableCell, TableRow, TextInput } from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { updateCompanyContact } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { RemoveCompanyContactButton } from "./RemoveCompanyContactButton";

export type CompanyContact = {
  id: string;
  full_name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
};

/**
 * Owner-only edit-in-place row — same pattern as
 * web/components/aorms/platform/ContactRow.tsx.
 */
export function CompanyContactRow({
  contact,
  companyId,
  isOwner,
}: {
  contact: CompanyContact;
  companyId: string;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateCompanyContact, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={isOwner ? 5 : 4}>
          <Form action={formAction}>
            <input type="hidden" name="contactId" value={contact.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <Stack gap={3}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
                <TextInput id={`edit-company-contact-name-${contact.id}`} name="fullName" labelText="Full name" defaultValue={contact.full_name} required />
                <TextInput
                  id={`edit-company-contact-role-${contact.id}`}
                  name="roleTitle"
                  labelText="Role / title"
                  defaultValue={contact.role_title ?? ""}
                />
                <TextInput id={`edit-company-contact-email-${contact.id}`} name="email" labelText="Email" type="email" defaultValue={contact.email ?? ""} />
                <TextInput id={`edit-company-contact-phone-${contact.id}`} name="phone" labelText="Phone" defaultValue={contact.phone ?? ""} />
              </div>
              <Checkbox
                id={`edit-company-contact-primary-${contact.id}`}
                name="isPrimary"
                labelText="Primary contact"
                defaultChecked={contact.is_primary}
              />
              {state?.error ? (
                <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton />
              ) : null}
              <Stack gap={3} orientation="horizontal">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" kind="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        {contact.full_name} {contact.is_primary && <Tag type="green" size="sm">Primary</Tag>}
      </TableCell>
      <TableCell>{contact.role_title ?? "—"}</TableCell>
      <TableCell>{contact.email ?? "—"}</TableCell>
      <TableCell>{contact.phone ?? "—"}</TableCell>
      {isOwner && (
        <TableCell>
          <Stack gap={2} orientation="horizontal">
            <Button kind="ghost" size="sm" hasIconOnly iconDescription={`Edit ${contact.full_name}`} renderIcon={Edit} onClick={() => setEditing(true)} />
            <RemoveCompanyContactButton contactId={contact.id} companyId={companyId} name={contact.full_name} />
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}
