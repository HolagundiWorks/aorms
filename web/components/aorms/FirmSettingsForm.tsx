"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { updateFirmSettings, type FirmSettingsActionState } from "../../lib/actions/firm";
import { GST_STATE_CODES } from "../../lib/tax/place-of-supply";
import { FormGrid } from "./FormGrid";

const STATE_NAMES = Object.keys(GST_STATE_CODES).sort();

export type FirmSettings = {
  company_name: string;
  firm_type: string;
  gst_type: string;
  gstin: string | null;
  pan: string | null;
  architect_name: string | null;
  coa_reg_no: string | null;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  tds_applicable_default: boolean;
};

const initialState: FirmSettingsActionState = null;

export function FirmSettingsForm({ firm }: { firm: FirmSettings }) {
  const [state, formAction, pending] = useActionState(updateFirmSettings, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="companyName" name="companyName" labelText="Company name" defaultValue={firm.company_name} required />
          <Select id="firmType" name="firmType" labelText="Firm type" defaultValue={firm.firm_type}>
            <SelectItem value="SOLO" text="Solo practice" />
            <SelectItem value="PARTNERSHIP" text="Partnership" />
          </Select>
          <TextInput id="architectName" name="architectName" labelText="Principal architect" defaultValue={firm.architect_name ?? ""} />
          <TextInput id="coaRegNo" name="coaRegNo" labelText="COA registration no." defaultValue={firm.coa_reg_no ?? ""} />
          <TextInput id="email" name="email" labelText="Email" type="email" defaultValue={firm.email ?? ""} />
          <TextInput id="phone" name="phone" labelText="Phone" defaultValue={firm.phone ?? ""} />
        </FormGrid>

        <h3 className="cds--type-productive-heading-02">GST & Tax</h3>
        <FormGrid>
          <Select id="gstType" name="gstType" labelText="GST system" defaultValue={firm.gst_type}>
            <SelectItem value="REGULAR" text="Regular" />
            <SelectItem value="COMPOSITION" text="Composition" />
            <SelectItem value="NOT_APPLICABLE" text="Not applicable" />
          </Select>
          <TextInput id="gstin" name="gstin" labelText="GSTIN" defaultValue={firm.gstin ?? ""} />
          <TextInput id="pan" name="pan" labelText="PAN" defaultValue={firm.pan ?? ""} />
        </FormGrid>
        <Checkbox
          id="tdsApplicableDefault"
          name="tdsApplicableDefault"
          labelText="Deduct TDS (s.194J) by default"
          defaultChecked={firm.tds_applicable_default}
        />

        <h3 className="cds--type-productive-heading-02" style={{ marginTop: "0.5rem" }}>
          Address
        </h3>
        <FormGrid>
          <TextInput id="addressLine1" name="addressLine1" labelText="Address line 1" defaultValue={firm.address_line1 ?? ""} />
          <TextInput id="addressLine2" name="addressLine2" labelText="Address line 2" defaultValue={firm.address_line2 ?? ""} />
          <TextInput id="city" name="city" labelText="City" defaultValue={firm.city ?? ""} />
          <TextInput id="district" name="district" labelText="District" defaultValue={firm.district ?? ""} />
          <Select id="state" name="state" labelText="State" defaultValue={firm.state ?? ""}>
            <SelectItem value="" text="— Select a state —" />
            {STATE_NAMES.map((s) => (
              <SelectItem key={s} value={s} text={s} />
            ))}
          </Select>
          <TextInput id="pincode" name="pincode" labelText="PIN code" defaultValue={firm.pincode ?? ""} />
        </FormGrid>

        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save firm settings"}
        </Button>
      </Stack>
    </Form>
  );
}
