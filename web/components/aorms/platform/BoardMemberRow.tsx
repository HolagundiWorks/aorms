"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Form, InlineNotification, Stack, TableCell, TableRow, TextInput } from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { updateBoardMember, type PlatformActionState } from "../../../lib/actions/platform";
import { RemoveBoardMemberButton } from "./RemoveBoardMemberButton";

export type BoardMember = {
  id: string;
  full_name: string;
  din: string | null;
  designation: string | null;
  appointed_at: string | null;
};

/**
 * Owner-only edit-in-place row: view mode shows plain text + Edit/Remove;
 * edit mode swaps in a form pre-filled with the current values. Closes
 * back to view mode itself on a successful save (watches the pending ->
 * not-pending transition from useActionState — there's no built-in
 * onSuccess callback) rather than relying on the parent's re-render,
 * since this row's own `editing` state would otherwise persist even
 * after the underlying data changes.
 */
export function BoardMemberRow({ member, companyId, isOwner }: { member: BoardMember; companyId: string; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateBoardMember, null);
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
                <TextInput id={`edit-board-name-${member.id}`} name="fullName" labelText="Full name" defaultValue={member.full_name} required />
                <TextInput
                  id={`edit-board-designation-${member.id}`}
                  name="designation"
                  labelText="Designation"
                  defaultValue={member.designation ?? ""}
                />
                <TextInput id={`edit-board-din-${member.id}`} name="din" labelText="DIN" defaultValue={member.din ?? ""} />
                <TextInput
                  id={`edit-board-appointed-${member.id}`}
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
            <RemoveBoardMemberButton boardMemberId={member.id} companyId={companyId} name={member.full_name} />
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}
