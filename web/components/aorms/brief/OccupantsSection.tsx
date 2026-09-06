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
import { addHouseholdMember, removeHouseholdMember, saveStaffRequirements } from "../../../lib/actions/project-brief";
import { FormGrid } from "../FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type HouseholdMember = { name: string; relation?: string; age?: number; occupation?: string };

export function OccupantsSection({
  projectId,
  household,
  staffRequirements,
  readOnly,
}: {
  projectId: string;
  household: HouseholdMember[];
  staffRequirements: string | null;
  readOnly: boolean;
}) {
  const boundSaveStaff = saveStaffRequirements.bind(null, projectId);
  const [staffState, staffFormAction, staffPending] = useActionState(boundSaveStaff, initialState);

  const boundAddMember = addHouseholdMember.bind(null, projectId);
  const [addState, addFormAction, addPending] = useActionState(boundAddMember, initialState);

  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove(index: number) {
    setRemoveError(null);
    startTransition(async () => {
      const res = await removeHouseholdMember(projectId, index);
      if (res.error) setRemoveError(res.error);
    });
  }

  return (
    <Stack gap={6}>
      <div>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.5rem" }}>
          Household
        </p>
        {!readOnly && (
          <Form action={addFormAction} style={{ marginBottom: "1rem" }}>
            <Stack gap={5}>
              {addState?.error && (
                <InlineNotification kind="error" title="Could not add" subtitle={addState.error} hideCloseButton lowContrast />
              )}
              <FormGrid>
                <TextInput id="occ-name" name="name" labelText="Name" required />
                <TextInput id="occ-relation" name="relation" labelText="Relation" />
                <TextInput id="occ-age" name="age" labelText="Age" type="number" step="any" />
                <TextInput id="occ-occupation" name="occupation" labelText="Occupation" />
              </FormGrid>
              <Button type="submit" disabled={addPending} size="sm">
                {addPending ? "Adding…" : "Add household member"}
              </Button>
            </Stack>
          </Form>
        )}
        {removeError && (
          <InlineNotification kind="error" title="Could not remove" subtitle={removeError} hideCloseButton lowContrast />
        )}
        <Table aria-label="Household" size="sm">
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Relation</TableHeader>
              <TableHeader>Age</TableHeader>
              <TableHeader>Occupation</TableHeader>
              {!readOnly && <TableHeader />}
            </TableRow>
          </TableHead>
          <TableBody>
            {household.map((m, i) => (
              <TableRow key={i}>
                <TableCell>{m.name}</TableCell>
                <TableCell>{m.relation ?? "—"}</TableCell>
                <TableCell>{m.age ?? "—"}</TableCell>
                <TableCell>{m.occupation ?? "—"}</TableCell>
                {!readOnly && (
                  <TableCell>
                    <Button
                      kind="ghost"
                      size="sm"
                      hasIconOnly
                      iconDescription={`Remove ${m.name}`}
                      renderIcon={TrashCan}
                      disabled={isPending}
                      onClick={() => handleRemove(i)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {household.length === 0 && (
              <TableRow>
                <TableCell colSpan={readOnly ? 4 : 5}>
                  <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                    No household members added yet.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Form action={staffFormAction}>
        <Stack gap={5}>
          {staffState?.error && (
            <InlineNotification kind="error" title="Could not save" subtitle={staffState.error} hideCloseButton lowContrast />
          )}
          <TextArea id="staffRequirements" name="staffRequirements" labelText="Staff requirements" rows={3} readOnly={readOnly} defaultValue={staffRequirements ?? ""} />
          {!readOnly && (
            <Button type="submit" disabled={staffPending} size="sm">
              {staffPending ? "Saving…" : "Save staff requirements"}
            </Button>
          )}
        </Stack>
      </Form>
    </Stack>
  );
}
