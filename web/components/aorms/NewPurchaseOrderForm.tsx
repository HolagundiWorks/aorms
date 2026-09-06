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
import {
  createPurchaseOrderRecord,
  type PurchaseOrderActionState,
} from "../../lib/actions/purchase-orders";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: PurchaseOrderActionState = null;

export function NewPurchaseOrderForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createPurchaseOrderRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create purchase order"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <TextInput id="vendor" name="vendor" labelText="Vendor" />
          <TextInput id="title" name="title" labelText="Title" />
          <TextInput id="totalPaise" name="totalPaise" labelText="Total (₹)" type="number" step="any" defaultValue="0" />
          <TextInput id="datePo" name="datePo" labelText="PO date" type="date" />
        </FormGrid>
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create purchase order"}
        </Button>
      </Stack>
    </Form>
  );
}
