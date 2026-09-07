"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button, Form, InlineNotification, Stack, TableCell, TableRow, TextInput } from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { updateProductTestResult } from "../../../../lib/actions/materials";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { RemoveProductTestResultButton } from "./RemoveProductTestResultButton";

export type ProductTestResult = {
  id: string;
  test_name: string;
  result: string;
  lab_name: string | null;
  tested_at: string | null;
};

/**
 * Owner-only edit-in-place row for one test result — same toggle pattern
 * as CompanyBoardMemberRow.tsx/ProductSpecRow.tsx, one level deeper.
 */
export function ProductTestResultRow({
  testResult,
  companyId,
  isOwner,
}: {
  testResult: ProductTestResult;
  companyId: string;
  isOwner: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateProductTestResult, null);
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
            <input type="hidden" name="testResultId" value={testResult.id} />
            <input type="hidden" name="companyId" value={companyId} />
            <Stack gap={3}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(12rem, 1fr))", gap: "1rem" }}>
                <TextInput id={`edit-test-name-${testResult.id}`} name="testName" labelText="Test" size="sm" defaultValue={testResult.test_name} required />
                <TextInput id={`edit-test-result-${testResult.id}`} name="result" labelText="Result" size="sm" defaultValue={testResult.result} required />
                <TextInput id={`edit-test-lab-${testResult.id}`} name="labName" labelText="Lab / agency" size="sm" defaultValue={testResult.lab_name ?? ""} />
                <TextInput
                  id={`edit-test-date-${testResult.id}`}
                  name="testedAt"
                  labelText="Tested on"
                  type="date"
                  size="sm"
                  defaultValue={testResult.tested_at ?? ""}
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
      <TableCell>{testResult.test_name}</TableCell>
      <TableCell>{testResult.result}</TableCell>
      <TableCell>{testResult.lab_name ?? "—"}</TableCell>
      <TableCell>{testResult.tested_at ?? "—"}</TableCell>
      {isOwner && (
        <TableCell>
          <Stack gap={2} orientation="horizontal">
            <Button
              kind="ghost"
              size="sm"
              hasIconOnly
              iconDescription={`Edit ${testResult.test_name}`}
              renderIcon={Edit}
              onClick={() => setEditing(true)}
            />
            <RemoveProductTestResultButton testResultId={testResult.id} companyId={companyId} testName={testResult.test_name} />
          </Stack>
        </TableCell>
      )}
    </TableRow>
  );
}
