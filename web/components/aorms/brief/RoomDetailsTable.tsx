"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { addRoomDetail, removeRoomDetail } from "../../../lib/actions/project-brief";
import type { SpaceRow } from "./SpaceScheduleTable";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type RoomDetail = {
  roomCode: string;
  ambience?: string;
  lighting?: string;
  flooring?: string;
  furniture?: string;
  notes?: string;
};

export function RoomDetailsTable({
  projectId,
  rows,
  spaces,
  readOnly,
}: {
  projectId: string;
  rows: RoomDetail[];
  spaces: SpaceRow[];
  readOnly: boolean;
}) {
  const boundAdd = addRoomDetail.bind(null, projectId);
  const [addState, addFormAction, addPending] = useActionState(boundAdd, initialState);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(index: number) {
    setRemoveError(null);
    startTransition(async () => {
      const res = await removeRoomDetail(projectId, index);
      if (res.error) setRemoveError(res.error);
    });
  }

  const spaceTitle = new Map(spaces.map((s) => [s.code, s.title]));

  return (
    <Stack gap={5}>
      {!readOnly && (
        <Form action={addFormAction}>
          <Stack gap={5}>
            {addState?.error && (
              <InlineNotification kind="error" title="Could not add" subtitle={addState.error} hideCloseButton lowContrast />
            )}
            {spaces.length === 0 ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                Add spaces to the Accommodation Schedule first — room details attach to a space.
              </p>
            ) : (
              <>
                <Select id="roomCode" name="roomCode" labelText="Space" defaultValue="">
                  <SelectItem value="" text="— Select a space —" />
                  {spaces.map((s) => (
                    <SelectItem key={s.code} value={s.code} text={`${s.code} — ${s.title}`} />
                  ))}
                </Select>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))", gap: "1rem" }}>
                  <TextInput id="ambience" name="ambience" labelText="Ambience" />
                  <TextInput id="lighting" name="lighting" labelText="Lighting" />
                  <TextInput id="rd-flooring" name="flooring" labelText="Flooring" />
                  <TextInput id="furniture" name="furniture" labelText="Furniture" />
                </div>
                <TextInput id="rd-notes" name="notes" labelText="Notes" />
                <Button type="submit" disabled={addPending} size="sm">
                  {addPending ? "Adding…" : "Add room detail"}
                </Button>
              </>
            )}
          </Stack>
        </Form>
      )}
      {removeError && (
        <InlineNotification kind="error" title="Could not remove" subtitle={removeError} hideCloseButton lowContrast />
      )}
      <Table aria-label="Room details" size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Space</TableHeader>
            <TableHeader>Ambience</TableHeader>
            <TableHeader>Lighting</TableHeader>
            <TableHeader>Flooring</TableHeader>
            <TableHeader>Furniture</TableHeader>
            {!readOnly && <TableHeader />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{spaceTitle.get(r.roomCode) ?? r.roomCode}</TableCell>
              <TableCell>{r.ambience ?? "—"}</TableCell>
              <TableCell>{r.lighting ?? "—"}</TableCell>
              <TableCell>{r.flooring ?? "—"}</TableCell>
              <TableCell>{r.furniture ?? "—"}</TableCell>
              {!readOnly && (
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    iconDescription="Remove room detail"
                    renderIcon={TrashCan}
                    disabled={isPending}
                    onClick={() => handleRemove(i)}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={readOnly ? 5 : 6}>
                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  No room details added yet.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
