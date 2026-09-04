"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { inviteTenderContractor } from "../../lib/actions/tenders";

type ContractorOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewTenderInviteForm({ tenderId, contractors }: { tenderId: string; contractors: ContractorOption[] }) {
  const boundAction = inviteTenderContractor.bind(null, tenderId);
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
