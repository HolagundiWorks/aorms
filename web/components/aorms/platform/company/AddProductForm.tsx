"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { addProduct } from "../../../../lib/actions/materials";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { FormGrid } from "../../FormGrid";

export function AddProductForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(addProduct, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={4}>
        <FormGrid>
          <TextInput id="product-name" name="name" labelText="Product name" placeholder="e.g. OPC 53 Grade Cement" required />
          <Select id="product-category" name="category" labelText="Category" defaultValue="BUILDING_MATERIAL">
            <SelectItem value="BUILDING_MATERIAL" text="Building material" />
            <SelectItem value="INTERIOR_MATERIAL" text="Interior material" />
            <SelectItem value="FINISH" text="Finish" />
            <SelectItem value="OTHER" text="Other" />
          </Select>
          <TextInput id="product-sku" name="sku" labelText="SKU" />
          <TextInput id="product-mrp" name="mrpPaise" labelText="MRP (₹)" placeholder="e.g. 450" />
        </FormGrid>
        <TextArea id="product-description" name="description" labelText="Description" rows={2} />
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't add" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="tertiary" size="sm" renderIcon={Add} disabled={pending}>
          {pending ? "Adding…" : "Add product"}
        </Button>
      </Stack>
    </Form>
  );
}
