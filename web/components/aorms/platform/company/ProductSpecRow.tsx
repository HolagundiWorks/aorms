"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { updateProductSpecification } from "../../../../lib/actions/materials";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { RemoveProductSpecButton } from "./RemoveProductSpecButton";

export type ProductSpec = { id: string; label: string; value: string };

/**
 * Owner-only edit-in-place row for one spec, one level deeper than
 * CompanyBoardMemberRow.tsx/CompanyContactRow.tsx (a spec belongs to a
 * product, which belongs to a company) but the same toggle pattern.
 */
export function ProductSpecRow({
  spec,
  companyId,
  isOwner,
}: {
  spec: ProductSpec;
  companyId: string;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateProductSpecification, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (editing) {
    return (
      <Form action={formAction}>
        <input type="hidden" name="specId" value={spec.id} />
        <input type="hidden" name="companyId" value={companyId} />
        <Stack gap={3} orientation="horizontal" style={{ alignItems: "flex-end" }}>
          <TextInput id={`edit-spec-label-${spec.id}`} name="label" labelText="Spec" size="sm" defaultValue={spec.label} required />
          <TextInput id={`edit-spec-value-${spec.id}`} name="value" labelText="Value" size="sm" defaultValue={spec.value} required />
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
          <Button type="button" kind="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
            Cancel
          </Button>
        </Stack>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
      </Form>
    );
  }

  return (
    <Stack gap={3} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between" }}>
      <span className="cds--type-body-01">
        <strong>{spec.label}:</strong> {spec.value}
      </span>
      {isOwner && (
        <Stack gap={1} orientation="horizontal">
          <Button kind="ghost" size="sm" hasIconOnly iconDescription={`Edit ${spec.label}`} renderIcon={Edit} onClick={() => setEditing(true)} />
          <RemoveProductSpecButton specId={spec.id} companyId={companyId} label={spec.label} />
        </Stack>
      )}
    </Stack>
  );
}
