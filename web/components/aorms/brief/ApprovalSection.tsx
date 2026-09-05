"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, Form, InlineNotification, Stack, TextArea, TextInput } from "@carbon/react";
import { approveBrief, reopenBrief } from "../../../lib/actions/project-brief";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export function ApprovalSection({
  projectId,
  approvalNote,
  approvedAt,
}: {
  projectId: string;
  approvalNote: string | null;
  approvedAt: string | null;
}) {
  const boundApprove = approveBrief.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundApprove, initialState);
  const [reopenError, setReopenError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleReopen() {
    setReopenError(null);
    startTransition(async () => {
      const res = await reopenBrief(projectId);
      if (res.error) setReopenError(res.error);
    });
  }

  if (approvedAt) {
    return (
      <Stack gap={5}>
        <InlineNotification
          kind="success"
          title="Brief approved"
          subtitle={`Approved on ${approvedAt}. Sections 1-8 are read-only — reopen to make further changes.`}
          hideCloseButton
          lowContrast
        />
        {approvalNote && <p className="cds--type-body-01">{approvalNote}</p>}
        <div>
          <Button size="sm" kind="tertiary" disabled={isPending} onClick={handleReopen}>
            {isPending ? "Reopening…" : "Reopen brief"}
          </Button>
        </div>
        {reopenError && (
          <InlineNotification kind="error" title="Could not reopen" subtitle={reopenError} hideCloseButton lowContrast />
        )}
      </Stack>
    );
  }

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not approve" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          Approving locks sections 1-8 as read-only context for the design team. This is a
          deliberate, reversible action — reopening is always available above.
        </p>
        <TextArea id="approvalNote" name="approvalNote" labelText="Client approval note" rows={2} defaultValue={approvalNote ?? ""} />
        <TextInput id="approvedAt" name="approvedAt" labelText="Approved on" type="date" />
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Approving…" : "Approve brief"}
          </Button>
        </div>
      </Stack>
    </Form>
  );
}
