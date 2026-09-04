"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createLeave } from "../../../lib/actions/hr";

type ActionState = { error: string } | null;
const initialState: ActionState = null;
const LEAVE_TYPES = ["CASUAL", "SICK", "EARNED", "UNPAID", "OTHER"];

export function NewLeaveForm({ memberId }: { memberId: string }) {
  const boundAction = createLeave.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not request leave" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <Select id="type" name="type" labelText="Type" defaultValue="CASUAL">
            {LEAVE_TYPES.map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
          <TextInput id="fromDate" name="fromDate" labelText="From" type="date" required />
          <TextInput id="toDate" name="toDate" labelText="To" type="date" required />
          <TextInput id="reason" name="reason" labelText="Reason" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Requesting…" : "Request leave"}
        </Button>
      </Stack>
    </Form>
  );
}
