"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { markAttendance } from "../../../lib/actions/hr";
import { FormGrid } from "../FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;
const STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "ON_LEAVE", "HOLIDAY"];

export function NewAttendanceForm({ memberId }: { memberId: string }) {
  const boundAction = markAttendance.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not mark attendance" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="attendanceDate" name="attendanceDate" labelText="Date" type="date" required />
          <Select id="status" name="status" labelText="Status" defaultValue="PRESENT">
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} text={s} />
            ))}
          </Select>
          <TextInput id="notes" name="notes" labelText="Notes" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Mark attendance"}
        </Button>
      </Stack>
    </Form>
  );
}
