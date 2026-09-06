"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createStandardFile, type StandardFileActionState } from "../../lib/actions/standards";
import { FormGrid } from "./FormGrid";

const initialState: StandardFileActionState = null;
const KINDS = ["PDF", "DWG", "IMAGE", "OTHER"];

export function NewStandardFileForm({ standardId }: { standardId: string }) {
  const boundAction = createStandardFile.bind(null, standardId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not register file" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <InlineNotification
          kind="info"
          title="Upload not wired up yet"
          subtitle="This registers a file entry; the actual upload path lands separately."
          hideCloseButton
          lowContrast
        />
        <FormGrid>
          <TextInput id="fileName" name="fileName" labelText="File name" required />
          <Select id="kind" name="kind" labelText="Kind" defaultValue="PDF">
            {KINDS.map((k) => (
              <SelectItem key={k} value={k} text={k} />
            ))}
          </Select>
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Registering…" : "Add file"}
        </Button>
      </Stack>
    </Form>
  );
}
