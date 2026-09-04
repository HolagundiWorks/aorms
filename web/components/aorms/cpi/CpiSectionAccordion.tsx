"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Stack, Tag } from "@carbon/react";
import type { SectionDef } from "../../../lib/cpi-sections";
import { saveCpiSection } from "../../../lib/actions/cpi";
import { FieldControl } from "./FieldControl";

type Answers = Record<string, unknown>;

/** One section's questions + local dirty-tracking + its own save action. */
export function CpiSectionAccordion({
  projectId,
  def,
  saved,
}: {
  projectId: string;
  def: SectionDef;
  saved: Answers;
}) {
  const [answers, setAnswers] = useState<Answers>(saved);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dirty = JSON.stringify(answers) !== JSON.stringify(saved);
  const answered = Object.keys(saved).length > 0;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveCpiSection(projectId, def.id, answers);
      if (res.error) setError(res.error);
    });
  }

  return (
    <Stack gap={5}>
      {def.intro && (
        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
          {def.intro}
        </p>
      )}
      {def.fields.map((f) => (
        <FieldControl
          key={f.id}
          field={f}
          value={answers[f.id]}
          onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))}
        />
      ))}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Button size="sm" kind={dirty ? "primary" : "tertiary"} disabled={!dirty || isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save section"}
        </Button>
        {answered && !dirty && (
          <Tag type="green" size="sm">
            Saved
          </Tag>
        )}
      </div>
      {error && <InlineNotification kind="error" title="Could not save" subtitle={error} hideCloseButton lowContrast />}
    </Stack>
  );
}
