"use client";

/**
 * ESTI Pulse's own free-text box (2026-09-12) — deliberately NOT in the
 * header (HeaderEsti stays a grounded Daily Brief, see its own header
 * comment). NL interaction gets this dedicated home instead, matching
 * the plan's explicit "own home rather than re-litigating the header
 * again" decision.
 */
import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea } from "@carbon/react";
import { askPulse, type AskPulseState } from "../../../lib/actions/ask-pulse";

type ProjectOption = { id: string; title: string };

const initialState: AskPulseState = null;

export function AskPulseForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(askPulse, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
          Ask about priorities, open tasks, or gaps — or, for a project&apos;s own meeting minutes, progress
          reports, and decisions, pick that project below first.
        </p>
        <TextArea
          id="question"
          name="question"
          labelText="Ask Pulse"
          placeholder="e.g. What's most urgent today? / What did we decide about the facade?"
          rows={2}
          maxCount={500}
          enableCounter
        />
        <Select id="projectId" name="projectId" labelText="Project (for record lookups)" defaultValue="">
          <SelectItem value="" text="— Not project-specific —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <Button type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
          {pending ? "Asking…" : "Ask"}
        </Button>
        {state?.error && <InlineNotification kind="error" title="Couldn't answer that" subtitle={state.error} hideCloseButton lowContrast />}
        {state?.output && (
          <div
            style={{ whiteSpace: "pre-wrap", borderTop: "1px solid var(--cds-border-subtle)", paddingTop: "0.75rem" }}
            className="cds--type-body-01"
          >
            {state.output}
          </div>
        )}
      </Stack>
    </Form>
  );
}
