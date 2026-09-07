"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { updateCompanyProfile, type PlatformActionState } from "../../../lib/actions/platform";
import { GST_STATE_CODES } from "../../../lib/tax/place-of-supply";
import { FormGrid } from "../FormGrid";

const STATE_NAMES = Object.keys(GST_STATE_CODES).sort();

export type CompanyProfile = {
  id: string;
  coa_registration_no: string | null;
  gstin: string | null;
  pan: string | null;
  gst_type: string;
  tds_applicable_default: boolean;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * The owner-editable form for a company's regulatory/contact profile —
 * this is the actual source of truth now; the Office Hub's Firm Settings
 * page only shows a read-only copy pointing here (see FirmSettingsForm.tsx).
 * Same field set/shape as that form deliberately (same data, new home).
 *
 * The caller MUST pass a `key` derived from `company`'s own fields (see
 * app/(platform)/companies/[companyId]/page.tsx) — every field here is an
 * uncontrolled input, which only applies its `defaultValue` on mount. See
 * UpdateLicenceForm.tsx's header comment for the exact bug this avoids
 * (a save silently reverting an untouched field to its stale first-load
 * value on the next save, found live testing this exact class of form).
 */
export function CompanyProfileForm({ company }: { company: CompanyProfile }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateCompanyProfile, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={company.id} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput
            id="coaRegistrationNo"
            name="coaRegistrationNo"
            labelText="COA registration no."
            defaultValue={company.coa_registration_no ?? ""}
          />
          <TextInput id="email" name="email" labelText="Email" type="email" defaultValue={company.email ?? ""} />
          <TextInput id="phone" name="phone" labelText="Phone" defaultValue={company.phone ?? ""} />
        </FormGrid>

        <h3 className="cds--type-productive-heading-02">GST & Tax</h3>
        <FormGrid>
          <Select id="gstType" name="gstType" labelText="GST system" defaultValue={company.gst_type}>
            <SelectItem value="REGULAR" text="Regular" />
            <SelectItem value="COMPOSITION" text="Composition" />
            <SelectItem value="NOT_APPLICABLE" text="Not applicable" />
          </Select>
          <TextInput id="gstin" name="gstin" labelText="GSTIN" defaultValue={company.gstin ?? ""} />
          <TextInput id="pan" name="pan" labelText="PAN" defaultValue={company.pan ?? ""} />
        </FormGrid>
        <Checkbox
          id="tdsApplicableDefault"
          name="tdsApplicableDefault"
          labelText="Deduct TDS (s.194J) by default"
          defaultChecked={company.tds_applicable_default}
        />

        <h3 className="cds--type-productive-heading-02" style={{ marginTop: "0.5rem" }}>
          Communication address
        </h3>
        <FormGrid>
          <TextInput id="addressLine1" name="addressLine1" labelText="Address line 1" defaultValue={company.address_line1 ?? ""} />
          <TextInput id="addressLine2" name="addressLine2" labelText="Address line 2" defaultValue={company.address_line2 ?? ""} />
          <TextInput id="city" name="city" labelText="City" defaultValue={company.city ?? ""} />
          <TextInput id="district" name="district" labelText="District" defaultValue={company.district ?? ""} />
          <Select id="state" name="state" labelText="State" defaultValue={company.state ?? ""}>
            <SelectItem value="" text="— Select a state —" />
            {STATE_NAMES.map((s) => (
              <SelectItem key={s} value={s} text={s} />
            ))}
          </Select>
          <TextInput id="pincode" name="pincode" labelText="PIN code" defaultValue={company.pincode ?? ""} />
        </FormGrid>

        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Save company profile"}
        </Button>
      </Stack>
    </Form>
  );
}
