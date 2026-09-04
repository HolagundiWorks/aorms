"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { createHrDocument } from "../../../lib/actions/hr";

type ActionState = { error: string } | null;
const initialState: ActionState = null;
const DOC_TYPES = ["AADHAAR", "PAN", "PASSPORT", "OFFER_LETTER", "APPOINTMENT_LETTER", "OTHER"];

export function NewHrDocumentForm({ memberId }: { memberId: string }) {
  const boundAction = createHrDocument.bind(null, memberId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not register document" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <InlineNotification
          kind="info"
          title="Upload not wired up yet"
          subtitle="This registers a document entry; the actual file upload path lands separately."
          hideCloseButton
          lowContrast
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
          <Select id="documentType" name="documentType" labelText="Document type" defaultValue="OTHER">
            {DOC_TYPES.map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
          <TextInput id="documentName" name="documentName" labelText="Document name" required />
          <TextInput id="issueDate" name="issueDate" labelText="Issue date" type="date" />
          <TextInput id="expiryDate" name="expiryDate" labelText="Expiry date" type="date" />
        </div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Registering…" : "Add document"}
        </Button>
      </Stack>
    </Form>
  );
}
