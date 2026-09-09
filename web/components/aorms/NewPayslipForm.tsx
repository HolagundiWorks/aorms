"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createPayslip } from "../../lib/actions/payslips";
import { FormGrid } from "./FormGrid";

type MemberOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewPayslipForm({ members, onSuccess }: { members: MemberOption[]; onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createPayslip, initialState);

  const prevPending = useRef(pending);
  useEffect(() => {
    if (prevPending.current && !pending && !state?.error) {
      onSuccess?.();
    }
    prevPending.current = pending;
  }, [pending, state, onSuccess]);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create payslip" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="teamMemberId" name="teamMemberId" labelText="Team member" defaultValue="">
            <SelectItem value="" text="— Select —" />
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <TextInput id="month" name="month" labelText="Month" placeholder="2026-09" required />
          <TextInput id="gross" name="gross" labelText="Gross (₹)" type="number" step="any" required />
          <TextInput id="deductions" name="deductions" labelText="Deductions (₹)" type="number" step="any" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Creating…" : "Create payslip"}
        </Button>
      </Stack>
    </Form>
  );
}
