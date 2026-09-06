"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { logDocumentIssue, type DocumentIssueActionState } from "../../lib/actions/document-issues";
import { FormGrid } from "./FormGrid";

type ProjectOption = { id: string; title: string };

const initialState: DocumentIssueActionState = null;

/**
 * The register's own check constraint (confirmed live against Supabase,
 * not assumed) only allows these nine — office documents with their own
 * issue/revision-note lifecycle. Drawings and invoices are deliberately
 * NOT here: drawings already track revisions natively (rev_no/rootId
 * chaining) and invoices have their own DRAFT/ISSUED/PAID status, so
 * neither needed a second, parallel register.
 */
const ENTITY_TYPES = [
  "LETTER",
  "CONTRACT",
  "PROPOSAL",
  "TRANSMITTAL",
  "INSPECTION",
  "SPEC_SHEET",
  "MOOD_BOARD",
  "MOM",
  "FEE_PROPOSAL",
];

export function NewDocumentIssueForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(logDocumentIssue, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not log issue" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
            <SelectItem value="" text="— Select a project —" />
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id} text={p.title} />
            ))}
          </Select>
          <Select id="entityType" name="entityType" labelText="Document type" defaultValue="TRANSMITTAL">
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t} text={t} />
            ))}
          </Select>
          <TextInput id="ref" name="ref" labelText="Reference" required />
          <TextInput id="versionNo" name="versionNo" labelText="Version" type="number" defaultValue="1" />
        </FormGrid>
        <TextArea id="revisionNote" name="revisionNote" labelText="Revision note" rows={2} />
        <TextArea id="impactNote" name="impactNote" labelText="Impact note (optional)" rows={2} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Logging…" : "Log issue"}
        </Button>
      </Stack>
    </Form>
  );
}
