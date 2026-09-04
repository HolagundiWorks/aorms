"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createMasterPlan, type MasterPlanActionState } from "../../lib/actions/master-plans";

const initialState: MasterPlanActionState = null;
const CATEGORIES = ["PDF", "DWG", "IMAGE", "OTHER"];

export function NewMasterPlanForm() {
  const [state, formAction, pending] = useActionState(createMasterPlan, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not register plan" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <InlineNotification
          kind="info"
          title="Upload not wired up yet"
          subtitle="This registers a master plan entry; the actual file upload path lands separately."
          hideCloseButton
          lowContrast
        />
        <TextInput id="name" name="name" labelText="Name" required />
        <Select id="category" name="category" labelText="Category" defaultValue="PDF">
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c} text={c} />
          ))}
        </Select>
        <TextInput id="fileName" name="fileName" labelText="File name" placeholder="e.g. Zoning-Master-Plan-2026.pdf" required />
        <TextInput id="notes" name="notes" labelText="Notes" />
        <Button type="submit" disabled={pending}>
          {pending ? "Registering…" : "Register plan"}
        </Button>
      </Stack>
    </Form>
  );
}
