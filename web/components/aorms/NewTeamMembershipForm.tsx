"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { addTeamMembership } from "../../lib/actions/teams";

type MemberOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewTeamMembershipForm({ teamId, members }: { teamId: string; members: MemberOption[] }) {
  const boundAction = addTeamMembership.bind(null, teamId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add member" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="teamMemberId" name="teamMemberId" labelText="Team member" defaultValue="">
          <SelectItem value="" text="— Select —" />
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id} text={m.name} />
          ))}
        </Select>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add to team"}
        </Button>
      </Stack>
    </Form>
  );
}
