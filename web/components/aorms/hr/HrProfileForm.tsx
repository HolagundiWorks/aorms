"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { saveHrProfile } from "../../../lib/actions/hr";
import { FormGrid } from "../FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type HrProfileValues = {
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_name: string | null;
  pf_uan: string | null;
};

export function HrProfileForm({ memberId, values }: { memberId: string; values: HrProfileValues | null }) {
  const boundAction = saveHrProfile.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save HR profile" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="dateOfBirth" name="dateOfBirth" labelText="Date of birth" type="date" defaultValue={values?.date_of_birth ?? ""} />
          <Select id="gender" name="gender" labelText="Gender" defaultValue={values?.gender ?? ""}>
            <SelectItem value="" text="—" />
            <SelectItem value="MALE" text="Male" />
            <SelectItem value="FEMALE" text="Female" />
            <SelectItem value="OTHER" text="Other" />
          </Select>
          <TextInput id="bloodGroup" name="bloodGroup" labelText="Blood group" defaultValue={values?.blood_group ?? ""} />
          <TextInput
            id="emergencyContactName"
            name="emergencyContactName"
            labelText="Emergency contact name"
            defaultValue={values?.emergency_contact_name ?? ""}
          />
          <TextInput
            id="emergencyContactRelation"
            name="emergencyContactRelation"
            labelText="Relation"
            defaultValue={values?.emergency_contact_relation ?? ""}
          />
          <TextInput
            id="emergencyContactPhone"
            name="emergencyContactPhone"
            labelText="Emergency contact phone"
            defaultValue={values?.emergency_contact_phone ?? ""}
          />
          <TextInput
            id="bankAccountNumber"
            name="bankAccountNumber"
            labelText="Bank account number"
            defaultValue={values?.bank_account_number ?? ""}
          />
          <TextInput id="bankIfsc" name="bankIfsc" labelText="Bank IFSC" defaultValue={values?.bank_ifsc ?? ""} />
          <TextInput id="bankName" name="bankName" labelText="Bank name" defaultValue={values?.bank_name ?? ""} />
          <TextInput id="pfUan" name="pfUan" labelText="PF UAN" defaultValue={values?.pf_uan ?? ""} />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Save HR profile"}
        </Button>
      </Stack>
    </Form>
  );
}
