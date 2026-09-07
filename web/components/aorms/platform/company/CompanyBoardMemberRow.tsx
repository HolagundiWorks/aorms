"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Form, InlineNotification, Stack, TableCell, TableRow, TextInput } from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { updateCompanyBoardMember } from "../../../../lib/actions/company";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { RemoveCompanyBoardMemberButton } from "./RemoveCompanyBoardMemberButton";

export type CompanyBoardMember = {
  id: string;
  full_name: string;
  din: string | null;
  designation: string | null;
  appointed_at: string | null;
};

/**
 * Owner-only edit-in-place row — same pattern as
 * web/components/aorms/platform/BoardMemberRow.tsx (see its header
 * comment for why `editing` closes itself on a successful save).
 */
export function CompanyBoardMemberRow({
  member,
  companyId,
  isOwner,
}: {
  member: CompanyBoardMember;
  companyId: string;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateCompanyBoardMember, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  if (editing) {
    return (
      <TableRow>
        <TableCell colSpan={isOwner ? 5 : 4}>
          <Form action={formAction}>
            <input type="hidden" name="boardMemberId" value={member.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <Stack gap={3}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
                <TextInput id={`edit-company-board-name-${member.id}`} name="fullName" labelText="Full name" defaultValue={member.full_name} required />
                <TextInput
                  id={`edit-company-board-designation-${member.id}`}
                  name="designation"
                  labelText="Designation"
                  defaultValue={member.designation ?? ""}
                />
                <TextInput id={`edit-company-board-din-${member.id}`} name="din" labelText="DIN" defaultValue={member.din ?? ""} />
                <TextInput
                  id={`edit-company-board-appointed-${member.id}`}
                  name="appointedAt"
                  labelText="Appointed on"
                  type="date"
                  defaultValue={member.appointed_at ?? ""}
                />
              </div>
              {state?.error ? (
                <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton />
              ) : null}
              <Stack gap={3} orientation="horizontal">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : "Save"}
                </Button>
                <Button type="button" kind="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Form>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{member.full_name}</TableCell>
      <TableCell>{member.designation ?? "—"}</TableCell>
      <TableCell>{member.din ?? "—"}</TableCell>
      <TableCell>{member.appointed_at ?? "—"}</TableCell>
      {isOwner && (
        <TableCell>
          <Stack gap={2} orientation="horizontal">
            <Button kind="ghost" size="sm" hasIconOnly iconDescription={`Edit ${member.full_name}`} renderIcon={Edit} onClick={() => setEditing(true)} />
            <RemoveCompanyBoardMemberButton boardMemberId={member.id} companyId={companyId} name={member.full_name} />
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}
