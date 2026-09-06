"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createRepoSource, type RepoSourceActionState } from "../../lib/actions/knowledge-bank";
import { FormGrid } from "./FormGrid";

const initialState: RepoSourceActionState = null;
const CATEGORIES = ["GENERAL", "DESIGN", "STRUCTURE", "MEP", "COMPLIANCE", "MANAGEMENT", "OTHER"];

export function NewRepoSourceForm() {
  const [state, formAction, pending] = useActionState(createRepoSource, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add source" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="title" name="title" labelText="Title" required />
          <TextInput id="author" name="author" labelText="Author" />
          <Select id="category" name="category" labelText="Category" defaultValue="GENERAL">
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} text={c} />
            ))}
          </Select>
        </FormGrid>
        <TextArea
          id="rawText"
          name="rawText"
          labelText="Source text (min. 200 characters)"
          rows={6}
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add source"}
        </Button>
      </Stack>
    </Form>
  );
}
