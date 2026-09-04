"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createPayslip } from "../../lib/actions/payslips";

type MemberOption = { id: string; name: string };
type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function NewPayslipForm({ members }: { members: MemberOption[] }) {
  const [state, formAction, pending] = useActionState(createPayslip, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not create payslip" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <Select id="teamMemberId" name="teamMemberId" labelText="Team member" defaultValue="">
            <SelectItem value="" text="— Select —" />
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id} text={m.name} />
            ))}
          </Select>
          <TextInput id="month" name="month" labelText="Month" placeholder="2026-09" required />
          <TextInput id="gross" name="gross" labelText="Gross (₹)" type="number" required />
          <TextInput id="deductions" name="deductions" labelText="Deductions (₹)" type="number" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Creating…" : "Create payslip"}
        </Button>
      </Stack>
    </Form>
  );
}
