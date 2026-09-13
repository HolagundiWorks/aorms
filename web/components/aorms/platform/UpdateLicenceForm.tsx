"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { adminUpdateLicence, type PaymentActionState } from "../../../lib/actions/platform-payments";
import { FormGrid } from "../FormGrid";

type Licence = { plan: string; seats: number; expires_at: string | null };

/**
 * Platform-admin override only (see app/(platform)/admin/licences/page.tsx)
 * — studio owners lost self-serve licence editing 2026-09-09 when real
 * Razorpay payments landed (platform/supabase/migrations/
 * 0011_licence_payment_gate.sql). adminUpdateLicence itself is gated by
 * both an app-level is_admin check and the "licences: admin update" RLS
 * policy — a non-admin caller can't reach this successfully regardless of
 * how this component is used.
 *
 * The caller MUST pass a `key` derived from `licence`'s own fields (see
 * the admin licences page) — every field here is an uncontrolled input
 * (`defaultValue`), which React only applies on mount. Found live:
 * without a changing key, saving once (e.g. plan -> PRO) then saving
 * again with only `seats` touched silently reverted plan back to its
 * value from the page's first load, because the already-mounted <select>
 * never picked up the new defaultValue on re-render.
 */
export function UpdateLicenceForm({ studioId, licence }: { studioId: string; licence: Licence }) {
  const [state, formAction, pending] = useActionState<PaymentActionState, FormData>(adminUpdateLicence, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="studioId" value={studioId} />
      <Stack gap={4}>
        <FormGrid>
          <Select id="licence-plan" name="plan" labelText="Plan" defaultValue={licence.plan}>
            <SelectItem value="TRIAL" text="Trial" />
            <SelectItem value="PRO" text="Pro" />
            <SelectItem value="ENTERPRISE" text="Enterprise" />
          </Select>
          {/* min={0}, not 1 (2026-09-14 SysDeX audit fix) — a free-tier
              TRIAL studio legitimately has 0 PRO seats now (see platform
              migration 0021); min={1} would block the browser's own
              native validation from ever letting an admin submit that
              real value. */}
          <TextInput id="licence-seats" name="seats" labelText="Seats" type="number" min={0} defaultValue={String(licence.seats)} />
          <TextInput
            id="licence-expires-at"
            name="expiresAt"
            labelText="Expires on (blank = no expiry)"
            type="date"
            defaultValue={licence.expires_at ? licence.expires_at.slice(0, 10) : ""}
          />
        </FormGrid>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Update licence"}
        </Button>
      </Stack>
    </Form>
  );
}
