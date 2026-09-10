"use client";

/**
 * Header trigger for ESTI's Daily Brief (2026-09-10 dashboard redesign)
 * — replaces the earlier free-text "Ask ESTI" question box. ESTI is now
 * a grounded phraser, not a general chatbot: no question to type, it
 * opens straight to a brief built from the studio's own real data (see
 * lib/actions/daily-brief.ts and docs/esti/DASHBOARD-AND-ESTI-PHRASER.md).
 * The old free-text `askEsti` Server Action (lib/actions/ai.ts) is left
 * in place, just no longer surfaced here. Pure stock Carbon (Popover/
 * Button/InlineLoading) — no custom-UI exception.
 */

import { useState, useTransition } from "react";
import { Button, HeaderGlobalAction, InlineLoading, Popover, PopoverContent } from "@carbon/react";
import { ChatBot, Renew } from "@carbon/icons-react";
import { generateDailyBrief } from "../../../lib/actions/daily-brief";

export function HeaderEsti() {
  const [open, setOpen] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  function loadBrief() {
    setError(null);
    startTransition(async () => {
      const res = await generateDailyBrief();
      setHasLoaded(true);
      if (res.error) setError(res.error);
      else setOutput(res.output);
    });
  }

  return (
    <Popover
      open={open}
      onRequestClose={() => setOpen(false)}
      align="bottom-end"
      caret
      highContrast
    >
      <HeaderGlobalAction
        aria-label="Today's Brief"
        isActive={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !hasLoaded) loadBrief();
        }}
      >
        <ChatBot size={20} />
      </HeaderGlobalAction>
      <PopoverContent>
        <div style={{ padding: "1rem", width: "22rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <span className="cds--type-heading-compact-01">ESTI — Today's Brief</span>
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            Grounded only in your studio's own data — no open-ended questions, nothing beyond what's already here.
          </p>
          {isPending && !output ? (
            <InlineLoading description="Building your brief…" />
          ) : error ? (
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)" }}>
              {error}
            </p>
          ) : output ? (
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
              {output}
            </div>
          ) : null}
          <Button kind="ghost" size="sm" renderIcon={Renew} disabled={isPending} onClick={loadBrief} style={{ alignSelf: "flex-start" }}>
            {isPending ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
