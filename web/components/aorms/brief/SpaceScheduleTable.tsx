"use client";

import { useActionState, useState, useTransition } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextArea,
  TextInput,
} from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import { addSpaceRow, removeSpaceRow } from "../../../lib/actions/project-brief";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type SpaceRow = { code: string; title: string; areaSqm?: number; floor?: string; description?: string };

export function SpaceScheduleTable({ projectId, rows, readOnly }: { projectId: string; rows: SpaceRow[]; readOnly: boolean }) {
  const boundAdd = addSpaceRow.bind(null, projectId);
  const [addState, addFormAction, addPending] = useActionState(boundAdd, initialState);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(index: number) {
    setRemoveError(null);
    startTransition(async () => {
      const res = await removeSpaceRow(projectId, index);
      if (res.error) setRemoveError(res.error);
    });
  }

  const totalArea = rows.reduce((sum, r) => sum + (r.areaSqm ?? 0), 0);

  return (
    <Stack gap={5}>
      {!readOnly && (
        <Form action={addFormAction}>
          <Stack gap={5}>
            {addState?.error && (
              <InlineNotification kind="error" title="Could not add space" subtitle={addState.error} hideCloseButton lowContrast />
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))", gap: "1rem" }}>
              <TextInput id="space-code" name="code" labelText="Code" placeholder="e.g. LR-01" required />
              <TextInput id="space-title" name="title" labelText="Space" required />
              <TextInput id="space-floor" name="floor" labelText="Floor" placeholder="e.g. Ground" />
              <TextInput id="space-area" name="areaSqm" labelText="Area (sqm)" type="number" step="any" />
            </div>
            <TextArea id="space-description" name="description" labelText="Description" rows={2} />
            <Button type="submit" disabled={addPending} size="sm">
              {addPending ? "Adding…" : "Add space"}
            </Button>
          </Stack>
        </Form>
      )}
      {removeError && (
        <InlineNotification kind="error" title="Could not remove" subtitle={removeError} hideCloseButton lowContrast />
      )}
      <Table aria-label="Accommodation schedule" size="sm">
        <TableHead>
          <TableRow>
            <TableHeader>Code</TableHeader>
            <TableHeader>Space</TableHeader>
            <TableHeader>Floor</TableHeader>
            <TableHeader>Area (sqm)</TableHeader>
            <TableHeader>Description</TableHeader>
            {!readOnly && <TableHeader />}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{r.code}</TableCell>
              <TableCell>{r.title}</TableCell>
              <TableCell>{r.floor ?? "—"}</TableCell>
              <TableCell>{r.areaSqm ?? "—"}</TableCell>
              <TableCell>{r.description ?? "—"}</TableCell>
              {!readOnly && (
                <TableCell>
                  <Button
                    kind="ghost"
                    size="sm"
                    hasIconOnly
                    iconDescription={`Remove ${r.title}`}
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
                  No spaces added yet.
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rows.length > 0 && (
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Total: {totalArea.toFixed(1)} sqm across {rows.length} space{rows.length === 1 ? "" : "s"}
        </p>
      )}
    </Stack>
  );
}
