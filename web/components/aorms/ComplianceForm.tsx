"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createComplianceRow, type ComplianceActionState } from "../../lib/actions/compliance";
import type { ComplianceTable } from "../../lib/compliance-fields";

const initialState: ComplianceActionState = null;

function label(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * One generic form for all five compliance sub-types — same shape
 * (a handful of text/number fields, no per-table widget variation),
 * so a single parametrized component beats five near-identical ones.
 */
export function ComplianceForm({
  table,
  fields,
}: {
  table: ComplianceTable;
  fields: { name: string; required: boolean }[];
}) {
  const boundAction = createComplianceRow.bind(null, table);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction} style={{ marginBottom: "2rem" }}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(14rem, 1fr))", gap: "1rem" }}>
          {fields.map((f) => (
            <TextInput
              key={f.name}
              id={`${table}-${f.name}`}
              name={f.name}
              labelText={label(f.name)}
              required={f.required}
            />
          ))}
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Add row"}
        </Button>
      </Stack>
    </Form>
  );
}
