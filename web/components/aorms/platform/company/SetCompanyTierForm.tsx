"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { adminSetCompanyTier, type ConnectDexActionState } from "../../../../lib/actions/connectdex";

/**
 * SysDeX-only manual tier assignment (2026-09-13) — no self-serve upgrade
 * flow exists yet, since Base Line/Pro/Pro Plus have no price attached
 * (explicit user direction). Mirrors SetPricingForm/UpdateLicenceForm's
 * uncontrolled-input-with-a-key pattern.
 */
export function SetCompanyTierForm({ companyId, tier }: { companyId: string; tier: string }) {
  const [state, formAction, pending] = useActionState<ConnectDexActionState, FormData>(adminSetCompanyTier, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={3} orientation="horizontal" style={{ alignItems: "flex-end" }}>
        <Select id={`company-tier-${companyId}`} name="tier" labelText="Tier" size="sm" defaultValue={tier}>
          <SelectItem value="BASE_LINE" text="Base Line" />
          <SelectItem value="PRO" text="Pro" />
          <SelectItem value="PRO_PLUS" text="Pro Plus" />
        </Select>
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </Stack>
      {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
    </Form>
  );
}
