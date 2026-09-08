"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { inviteStaffMember } from "../../lib/actions/portal-invites";
import { FormGrid } from "./FormGrid";

const initialState: { error: string } | null = null;

/** Invite a brand-new staff member — the other half of /users' own flagged
 * gap. OWNER not selectable (an owner account is provisioned outside this
 * flow, matching the assignable-roles convention UserRoleSelect already
 * follows for changing an existing user's role). */
export function NewStaffInviteForm() {
  const [state, formAction, pending] = useActionState(inviteStaffMember, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not invite" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="invite-fullName" name="fullName" labelText="Name" required />
          <TextInput id="invite-email" name="email" labelText="Email" type="email" required />
          <Select id="invite-role" name="role" labelText="Role" defaultValue="ASSOCIATE">
            <SelectItem value="PARTNER" text="Partner / Finance & HR Lead" />
            <SelectItem value="ACCOUNTANT" text="Accountant / Finance" />
            <SelectItem value="HR_MANAGER" text="HR Manager" />
            <SelectItem value="SENIOR" text="Senior" />
            <SelectItem value="ASSOCIATE" text="Associate" />
            <SelectItem value="VIEWER" text="Viewer" />
            <SelectItem value="SITE_SUPERVISOR" text="Site Supervisor" />
          </Select>
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Inviting…" : "Invite staff member"}
        </Button>
      </Stack>
    </Form>
  );
}
