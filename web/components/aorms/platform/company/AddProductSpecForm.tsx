"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { addProductSpecification } from "../../../../lib/actions/materials";
import type { PlatformActionState } from "../../../../lib/actions/platform";

export function AddProductSpecForm({ productId, companyId }: { productId: string; companyId: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(addProductSpecification, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={3} orientation="horizontal" style={{ alignItems: "flex-end" }}>
        <TextInput id={`spec-label-${productId}`} name="label" labelText="Spec" size="sm" placeholder="e.g. Compressive strength" />
        <TextInput id={`spec-value-${productId}`} name="value" labelText="Value" size="sm" placeholder="e.g. 53 MPa" />
        <Button type="submit" kind="ghost" size="sm" renderIcon={Add} disabled={pending} hasIconOnly iconDescription="Add spec" />
      </Stack>
      {state?.error ? (
        <InlineNotification kind="error" title="Couldn't add" subtitle={state.error} lowContrast hideCloseButton />
      ) : null}
    </Form>
  );
}
