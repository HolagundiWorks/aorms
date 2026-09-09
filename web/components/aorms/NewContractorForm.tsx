"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createContractor, type ContractorActionState } from "../../lib/actions/contractors";
import { FormGrid } from "./FormGrid";

const initialState: ContractorActionState = null;

const CATEGORIES: Record<string, string> = {
  CIVIL: "Civil / RCC",
  STRUCTURAL_STEEL: "Structural steel",
  MEP: "MEP",
  ELECTRICAL: "Electrical",
  PLUMBING: "Plumbing",
  HVAC: "HVAC",
  INTERIOR: "Interior / fit-out",
  FACADE: "Facade / glazing",
  WATERPROOFING: "Waterproofing",
  FLOORING: "Flooring",
  PAINTING: "Painting",
  LANDSCAPE: "Landscape",
  GENERAL: "General contractor",
  OTHER: "Other",
};

export function NewContractorForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [state, formAction, pending] = useActionState(createContractor, initialState);

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
          <InlineNotification kind="error" title="Could not add contractor" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="name" name="name" labelText="Name" required />
          <Select id="category" name="category" labelText="Category" defaultValue="GENERAL">
            {Object.entries(CATEGORIES).map(([code, label]) => (
              <SelectItem key={code} value={code} text={label} />
            ))}
          </Select>
          <TextInput id="companyName" name="companyName" labelText="Company name" />
          <TextInput id="contactPerson" name="contactPerson" labelText="Contact person" />
          <TextInput id="email" name="email" labelText="Email" type="email" />
          <TextInput id="phone" name="phone" labelText="Phone" />
          <TextInput id="city" name="city" labelText="City" />
          <TextInput id="state" name="state" labelText="State" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add contractor"}
        </Button>
      </Stack>
    </Form>
  );
}
