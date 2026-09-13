"use client";

/**
 * ESTI Pulse's own free-text box (2026-09-12) — deliberately NOT in the
 * header (HeaderEsti stays a grounded Daily Brief, see its own header
 * comment). NL interaction gets this dedicated home instead, matching
 * the plan's explicit "own home rather than re-litigating the header
 * again" decision.
 *
 * 2026-09-14 simplification (explicit request): dropped the intro
 * helper paragraph and the manual "Project" selector — project scoping
 * is now entirely automatic from screen context (FloatingAskPulse.tsx
 * parses the current URL), carried here as a plain hidden field rather
 * than a visible dropdown. `projects` is no longer needed by this
 * component at all (nothing left renders from it); callers stopped
 * passing it in the same change.
 */
import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextArea } from "@carbon/react";
import { askPulse, type AskPulseState } from "../../../lib/actions/ask-pulse";

const initialState: AskPulseState = null;

export function AskPulseForm({
  defaultProjectId,
}: {
  /** Set by FloatingAskPulse.tsx from the current URL when the screen is
   * a project's own page — submitted as a hidden field so the question
   * is scoped to that project without any visible control for it. */
  defaultProjectId?: string;
}) {
  const [state, formAction, pending] = useActionState(askPulse, initialState);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        {/* readOnly: a plain reactive `value` (not `defaultValue`) so this
            actually updates if `defaultProjectId` changes without a
            remount — React just warns about a controlled field with no
            onChange otherwise, which `readOnly` cleanly states is
            intentional for a field the user never edits directly. */}
        <input type="hidden" name="projectId" value={defaultProjectId ?? ""} readOnly />
        <TextArea
          id="question"
          name="question"
          labelText="Ask ESTI"
          placeholder="e.g. What's most urgent today? / What did we decide about the facade?"
          rows={2}
          maxCount={500}
          enableCounter
        />
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
