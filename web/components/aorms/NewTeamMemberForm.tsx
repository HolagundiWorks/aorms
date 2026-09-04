"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createTeamMember, type TeamMemberActionState } from "../../lib/actions/team-members";

const initialState: TeamMemberActionState = null;
const EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"];

export function NewTeamMemberForm() {
  const [state, formAction, pending] = useActionState(createTeamMember, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add team member" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))", gap: "1rem" }}>
          <TextInput id="name" name="name" labelText="Name" required />
          <TextInput id="role" name="role" labelText="Role" placeholder="e.g. Senior Architect" required />
          <TextInput id="jobTitle" name="jobTitle" labelText="Job title" />
          <Select id="employmentType" name="employmentType" labelText="Employment type" defaultValue="FULL_TIME">
            {EMPLOYMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="phone" name="phone" labelText="Phone" />
          <TextInput id="monthlySalary" name="monthlySalary" labelText="Monthly salary (₹)" type="number" />
          <TextInput id="dateJoined" name="dateJoined" labelText="Date joined" type="date" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add team member"}
        </Button>
      </Stack>
    </Form>
  );
}
