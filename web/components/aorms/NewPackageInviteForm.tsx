"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { inviteContractor } from "../../lib/actions/pmc-packages";

type ContractorOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewPackageInviteForm({ packageId, contractors }: { packageId: string; contractors: ContractorOption[] }) {
  const boundAction = inviteContractor.bind(null, packageId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not invite" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="contractorId" name="contractorId" labelText="Contractor" defaultValue="">
          <SelectItem value="" text="— Select —" />
          {contractors.map((c) => (
            <SelectItem key={c.id} value={c.id} text={c.name} />
          ))}
        </Select>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Inviting…" : "Invite"}
        </Button>
      </Stack>
    </Form>
  );
}
