"use client";

import { useActionState } from "react";
import {
  Button,
  Checkbox,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { createInvoiceRecord, type InvoiceActionState } from "../../lib/actions/invoices";
import { SAC_CODES } from "../../lib/tax/gst";
import { FormGrid } from "./FormGrid";

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
        <FormGrid>
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
          <Select id="gstSystem" name="gstSystem" labelText="GST system (blank = firm default)" defaultValue="">
            <SelectItem value="" text="— Firm default —" />
            <SelectItem value="REGULAR" text="Regular" />
            <SelectItem value="COMPOSITION" text="Composition" />
            <SelectItem value="NOT_APPLICABLE" text="Not applicable" />
          </Select>
          <Select id="sac" name="sac" labelText="SAC code (Regular only)" defaultValue="998322">
            {SAC_CODES.map((s) => (
              <SelectItem key={s.code} value={s.code} text={`${s.code} — ${s.label}`} />
            ))}
          </Select>
          <TextInput
            id="taxablePaise"
            name="taxablePaise"
            labelText="Taxable amount (₹)"
            type="number" step="any"
            defaultValue="0"
          />
          <TextInput id="dateInvoice" name="dateInvoice" labelText="Invoice date" type="date" />
        </FormGrid>
        <Checkbox id="isAdvance" name="isAdvance" labelText="Advance invoice" />
        <TextArea id="notes" name="notes" labelText="Notes" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invoice"}
        </Button>
      </Stack>
    </Form>
  );
}
