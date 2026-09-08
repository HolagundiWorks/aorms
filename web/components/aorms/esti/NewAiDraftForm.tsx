"use client";

import { useActionState, useState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea } from "@carbon/react";
import { generateAiDraft, type GenerateAiDraftState } from "../../../lib/actions/ai";
import { AI_DRAFT_KINDS, AI_DRAFT_KIND_LABEL, draftKindNeedsProject, type AiDraftKind } from "../../../lib/ai/draft-kinds";
import { FormGrid } from "../FormGrid";

const initialState: GenerateAiDraftState = null;

export function NewAiDraftForm({ projects }: { projects: { id: string; ref: string; title: string }[] }) {
  const [state, formAction, pending] = useActionState(generateAiDraft, initialState);
  const [kind, setKind] = useState<AiDraftKind>("PROPOSAL");
  const needsProject = draftKindNeedsProject(kind);

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not generate" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <Select
            id="draft-kind"
            name="kind"
            labelText="Draft kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AiDraftKind)}
          >
            {AI_DRAFT_KINDS.map((k) => (
              <SelectItem key={k} value={k} text={AI_DRAFT_KIND_LABEL[k]} />
            ))}
          </Select>
          {needsProject ? (
            <Select id="draft-project" name="projectId" labelText="Project" defaultValue="">
              <SelectItem value="" text="Choose a project" disabled hidden />
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} text={`${p.ref} — ${p.title}`} />
              ))}
            </Select>
          ) : (
            <p className="cds--type-body-01" style={{ alignSelf: "end", color: "var(--cds-text-secondary)" }}>
              Office-wide — no project needed.
            </p>
          )}
        </FormGrid>
        <TextArea
          id="draft-prompt"
          name="prompt"
          labelText="Extra instructions (optional)"
          placeholder="e.g. keep it under 150 words; client name is spelled Sharma"
          rows={3}
        />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Generating…" : "Generate draft"}
        </Button>
      </Stack>
    </Form>
  );
}
