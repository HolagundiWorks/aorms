"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { addProductTestResult } from "../../../../lib/actions/materials";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { FormGrid } from "../../FormGrid";

export function AddProductTestResultForm({ productId, companyId }: { productId: string; companyId: string }) {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(addProductTestResult, null);

  return (
    <Form action={formAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="companyId" value={companyId} />
      <Stack gap={3}>
        <FormGrid>
          <TextInput id={`test-name-${productId}`} name="testName" labelText="Test" size="sm" placeholder="e.g. Compressive strength" />
          <TextInput id={`test-result-${productId}`} name="result" labelText="Result" size="sm" placeholder="e.g. 54.2 MPa" />
          <TextInput id={`test-lab-${productId}`} name="labName" labelText="Lab / agency" size="sm" />
          <TextInput id={`test-date-${productId}`} name="testedAt" labelText="Tested on" type="date" size="sm" />
        </FormGrid>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't add" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" kind="ghost" size="sm" renderIcon={Add} disabled={pending}>
          {pending ? "Adding…" : "Add test result"}
        </Button>
      </Stack>
    </Form>
  );
}
