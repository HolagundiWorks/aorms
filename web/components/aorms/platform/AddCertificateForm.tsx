"use client";

import { useActionState } from "react";
import { Button, FileUploader, Form, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { addAccountCertificate, type AccountProfileActionState } from "../../../lib/actions/account-profile";

export function AddCertificateForm() {
  const [state, formAction, pending] = useActionState<AccountProfileActionState, FormData>(addAccountCertificate, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <Select id="kind" name="kind" labelText="Type" defaultValue="DEGREE">
          <SelectItem value="DEGREE" text="Degree certificate" />
          <SelectItem value="SOFTWARE" text="Software certification" />
          <SelectItem value="OTHER" text="Other" />
        </Select>
        <TextInput id="title" name="title" labelText="Title" placeholder="e.g. B.Arch, Autodesk Revit Certified Professional" required />
        <TextInput id="issuer" name="issuer" labelText="Issuer (optional)" placeholder="e.g. Council of Architecture, Autodesk" />
        {/* Carbon's TextInput with the native `date` type — not
            DatePicker/DatePickerInput, whose TS types don't accept a
            `name` prop at all (needed for plain FormData submission
            here). The native input already gives Carbon's own chrome
            (label, focus state) plus the browser's real date-picking UI,
            and submits an unambiguous ISO string straight into a
            Postgres `date` column with no server-side reformatting. */}
        <TextInput id="issuedOn" name="issuedOn" type="date" labelText="Issued on (optional)" />
        <FileUploader
          id="file"
          name="file"
          labelTitle="Certificate file (optional)"
          labelDescription="JPEG, PNG, WebP, or PDF, up to 10MB"
          buttonLabel="Choose file"
          filenameStatus="edit"
          accept={[".jpg", ".jpeg", ".png", ".webp", ".pdf"]}
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't add" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" renderIcon={Add} kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add certificate"}
        </Button>
      </Stack>
    </Form>
  );
}
