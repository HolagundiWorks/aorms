"use client";

/**
 * Header trigger for the ESTI AI agent — read-only Q&A against Ollama (see
 * lib/actions/ai.ts). Pure stock Carbon (Popover/TextArea/Button/
 * InlineLoading) — no custom-UI exception here (only Pomodoro has one).
 */

import { useActionState, useState } from "react";
import { Button, HeaderGlobalAction, InlineLoading, Popover, PopoverContent, TextArea } from "@carbon/react";
import { ChatBot } from "@carbon/icons-react";
import { askEsti, type AskEstiState } from "../../../lib/actions/ai";

const initialState: AskEstiState = null;

export function HeaderEsti() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(askEsti, initialState);

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="bottom-end" caret highContrast>
      <HeaderGlobalAction aria-label="Ask ESTI" isActive={open} onClick={() => setOpen((o) => !o)}>
        <ChatBot size={20} />
      </HeaderGlobalAction>
      <PopoverContent>
        <form
          action={formAction}
          style={{ padding: "1rem", width: "22rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <span className="cds--type-heading-compact-01">Ask ESTI</span>
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            Read-only — answers from a live office snapshot. Won&apos;t create, issue, or change anything.
          </p>
          <TextArea id="esti-question" name="question" labelText="Question" hideLabel rows={2} placeholder="e.g. How many invoices are still unpaid?" />
          <Button type="submit" size="sm" disabled={pending} style={{ alignSelf: "flex-start" }}>
            {pending ? <InlineLoading description="Asking…" /> : "Ask"}
          </Button>
          {state?.error ? (
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)" }}>
              {state.error}
            </p>
          ) : null}
          {state?.output ? (
            <div
              style={{
                whiteSpace: "pre-wrap",
                maxHeight: "16rem",
                overflowY: "auto",
                borderTop: "1px solid var(--cds-border-subtle)",
                paddingTop: "0.75rem",
              }}
              className="cds--type-body-01"
            >
              {state.output}
            </div>
          ) : null}
        </form>
      </PopoverContent>
    </Popover>
  );
}
