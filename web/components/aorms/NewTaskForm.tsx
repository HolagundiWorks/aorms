"use client";

import { useActionState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { createTaskRecord, type TaskActionState } from "../../lib/actions/tasks";

type ProjectOption = { id: string; title: string };
type AssigneeOption = { id: string; full_name: string | null };

const initialState: TaskActionState = null;

export function NewTaskForm({
  projects,
  assignees,
}: {
  projects: ProjectOption[];
  assignees: AssigneeOption[];
}) {
  const [state, formAction, pending] = useActionState(createTaskRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create task"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <TextInput id="title" name="title" labelText="Title" required />
        <TextArea id="description" name="description" labelText="Description" rows={2} />
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— No project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <Select id="assigneeId" name="assigneeId" labelText="Assignee" defaultValue="">
          <SelectItem value="" text="— Unassigned —" />
          {assignees.map((a) => (
            <SelectItem key={a.id} value={a.id} text={a.full_name ?? a.id} />
          ))}
        </Select>
        <Select id="classification" name="classification" labelText="Classification" defaultValue="">
          <SelectItem value="" text="— None —" />
          <SelectItem value="BILLABLE" text="Billable" />
          <SelectItem value="NON_BILLABLE" text="Non-billable" />
          <SelectItem value="TRAINING" text="Training" />
          <SelectItem value="COLLABORATION" text="Collaboration" />
          <SelectItem value="PERSONAL" text="Personal" />
        </Select>
        <Select id="workType" name="workType" labelText="Work type" defaultValue="">
          <SelectItem value="" text="— None —" />
          <SelectItem value="DESIGN_COMMUNICATION" text="Design Communication" />
          <SelectItem value="DESIGN_DEVELOPMENT" text="Design Development" />
          <SelectItem value="TECHNICAL_PRODUCTION" text="Technical Production" />
          <SelectItem value="CONSTRUCTION_SUPPORT" text="Construction Support" />
        </Select>
        <Select id="priority" name="priority" labelText="Priority" defaultValue="MEDIUM">
          <SelectItem value="LOW" text="Low" />
          <SelectItem value="MEDIUM" text="Medium" />
          <SelectItem value="HIGH" text="High" />
          <SelectItem value="CRITICAL" text="Critical" />
        </Select>
        <TextInput id="dueDate" name="dueDate" labelText="Due date" type="date" />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create task"}
        </Button>
      </Stack>
    </Form>
  );
}
