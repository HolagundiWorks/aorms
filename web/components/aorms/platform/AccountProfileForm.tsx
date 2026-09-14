"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { Save } from "@carbon/icons-react";
import { updateAccountProfile, type AccountProfileActionState } from "../../../lib/actions/account-profile";

type Props = {
  profile: {
    nickname: string | null;
    degree: string | null;
    qualification: string | null;
    coa_number: string | null;
    additional_qualifications: string | null;
  };
};

export function AccountProfileForm({ profile }: Props) {
  const [state, formAction, pending] = useActionState<AccountProfileActionState, FormData>(updateAccountProfile, null);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        <TextInput id="nickname" name="nickname" labelText="Nickname" defaultValue={profile.nickname ?? ""} />
        <TextInput
          id="degree"
          name="degree"
          labelText="Degree"
          placeholder="e.g. B.Arch, M.Arch"
          defaultValue={profile.degree ?? ""}
        />
        <TextInput
          id="qualification"
          name="qualification"
          labelText="Qualification"
          placeholder="e.g. Bachelor of Architecture, 2018"
          defaultValue={profile.qualification ?? ""}
        />
        <TextInput
          id="coaNumber"
          name="coaNumber"
          labelText="COA registration number"
          placeholder="Council of Architecture registration"
          defaultValue={profile.coa_number ?? ""}
        />
        <TextArea
          id="additionalQualifications"
          name="additionalQualifications"
          labelText="Additional qualifications"
          placeholder="Any other qualifications, courses, or credentials"
          rows={3}
          defaultValue={profile.additional_qualifications ?? ""}
        />
        {state?.error ? <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" renderIcon={Save} kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </Stack>
    </Form>
  );
}
