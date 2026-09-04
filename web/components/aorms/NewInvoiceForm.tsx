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
import { createInvoiceRecord, type InvoiceActionState } from "../../lib/actions/invoices";

type ProjectOption = { id: string; title: string };
type ClientOption = { id: string; name: string };

const initialState: InvoiceActionState = null;

export function NewInvoiceForm({
  projects,
  clients,
}: {
  projects: ProjectOption[];
  clients: ClientOption[];
}) {
  const [state, formAction, pending] = useActionState(createInvoiceRecord, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification
            kind="error"
            title="Could not create invoice"
            subtitle={state.error}
            hideCloseButton
            lowContrast
          />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <Select id="clientId" name="clientId" labelText="Client" defaultValue="">
          <SelectItem value="" text="— No client —" />
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id} text={c.name} />
          ))}
        </Select>
        <Select id="gstSystem" name="gstSystem" labelText="GST system" defaultValue="REGULAR">
          <SelectItem value="REGULAR" text="Regular" />
          <SelectItem value="COMPOSITION" text="Composition" />
        </Select>
        <Select id="documentKind" name="documentKind" labelText="Document kind" defaultValue="TAX_INVOICE">
          <SelectItem value="TAX_INVOICE" text="Tax invoice" />
          <SelectItem value="BILL_OF_SUPPLY" text="Bill of supply" />
        </Select>
        <TextInput
          id="taxablePaise"
          name="taxablePaise"
          labelText="Taxable amount (₹)"
          type="number"
          defaultValue="0"
        />
        <TextInput id="dateInvoice" name="dateInvoice" labelText="Invoice date" type="date" />
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invoice"}
        </Button>
      </Stack>
    </Form>
  );
}
