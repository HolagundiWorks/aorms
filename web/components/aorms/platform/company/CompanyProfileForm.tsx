"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { updateCompanyProfile } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { GST_STATE_CODES } from "../../../../lib/tax/place-of-supply";
import { FormGrid } from "../../FormGrid";

const STATE_NAMES = Object.keys(GST_STATE_CODES).sort();

export type CompanyProfile = {
  id: string;
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
 * Owner-editable form for a supplier company's regulatory/contact
 * profile. No COA registration field here (unlike StudioProfileForm.tsx)
 * — Council of Architecture registration doesn't apply to a material
 * supplier. The caller MUST pass a `key` derived from `company`'s own
 * fields — see StudioProfileForm.tsx/UpdateLicenceForm.tsx's header
 * comments for the exact stale-uncontrolled-input bug this avoids.
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
          <TextInput id="company-email" name="email" labelText="Email" type="email" defaultValue={company.email ?? ""} />
          <TextInput id="company-phone" name="phone" labelText="Phone" defaultValue={company.phone ?? ""} />
        </FormGrid>

        <h3 className="cds--type-productive-heading-02">GST & Tax</h3>
        <FormGrid>
          <Select id="company-gstType" name="gstType" labelText="GST system" defaultValue={company.gst_type}>
            <SelectItem value="REGULAR" text="Regular" />
            <SelectItem value="COMPOSITION" text="Composition" />
            <SelectItem value="NOT_APPLICABLE" text="Not applicable" />
          </Select>
          <TextInput id="company-gstin" name="gstin" labelText="GSTIN" defaultValue={company.gstin ?? ""} />
          <TextInput id="company-pan" name="pan" labelText="PAN" defaultValue={company.pan ?? ""} />
        </FormGrid>
        <Checkbox
          id="company-tdsApplicableDefault"
          name="tdsApplicableDefault"
          labelText="Deduct TDS (s.194J) by default"
          defaultChecked={company.tds_applicable_default}
        />

        <h3 className="cds--type-productive-heading-02" style={{ marginTop: "0.5rem" }}>
          Communication address
        </h3>
        <FormGrid>
          <TextInput id="company-addressLine1" name="addressLine1" labelText="Address line 1" defaultValue={company.address_line1 ?? ""} />
          <TextInput id="company-addressLine2" name="addressLine2" labelText="Address line 2" defaultValue={company.address_line2 ?? ""} />
          <TextInput id="company-city" name="city" labelText="City" defaultValue={company.city ?? ""} />
          <TextInput id="company-district" name="district" labelText="District" defaultValue={company.district ?? ""} />
          <Select id="company-state" name="state" labelText="State" defaultValue={company.state ?? ""}>
            <SelectItem value="" text="— Select a state —" />
            {STATE_NAMES.map((s) => (
              <SelectItem key={s} value={s} text={s} />
            ))}
          </Select>
          <TextInput id="company-pincode" name="pincode" labelText="PIN code" defaultValue={company.pincode ?? ""} />
        </FormGrid>

        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Saving…" : "Save company profile"}
        </Button>
      </Stack>
    </Form>
  );
}
