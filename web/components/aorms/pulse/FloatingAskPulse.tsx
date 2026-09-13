"use client";

/**
 * Floating "Ask ESTI" button (2026-09-14, explicit request) — the same
 * deterministic NL box that already lives in Pulse's own Task Prediction
 * panel (AskPulseForm.tsx), now also reachable from every screen, not
 * just /pulse. Same Popover/PopoverContent pattern every other header
 * widget uses (HeaderWellness.tsx etc.), just anchored to a fixed
 * position instead of the header bar. Sits directly above
 * BrandWatermark.tsx in the same bottom-right corner, with enough
 * clearance that the two never overlap.
 *
 * Labeled "ESTI" (2026-09-14, explicit correction: "our ai is esti not
 * ask pulse") — the underlying engine is still Pulse's own deterministic
 * interpreter (lib/pulse/interpreter.ts, lib/actions/ask-pulse.ts —
 * unrelated to HeaderEsti's Ollama-backed Daily Brief, itself a
 * different feature under the same brand), but the user-facing identity
 * this app presents for "the AI" is ESTI everywhere, so the button says
 * that rather than naming an internal engine. Light theme, not
 * `highContrast` (explicit request) — matches every other header
 * widget's own popover. Icon is Carbon's own square `Ai` glyph from its
 * AI icon set (explicit request: "square ai icons from carbon ai pack"),
 * not a generic chat bubble.
 *
 * Screen-specific context (explicit request: "the current screen will
 * give the pulse context") — when the URL is a project's own page
 * (/projects/<id>, /projects/<id>/brief, etc.), that project is used to
 * scope the question automatically (AskPulseForm.tsx's hidden field),
 * matched against the real `projects` list, not just parsed off the URL
 * shape, so a non-project route that happens to start with "/projects/"
 * some other way never falsely triggers this. No visible project
 * picker any more (explicit request) — the "Scoped to…" line below is
 * the only indication, so the automatic behavior is still disclosed
 * rather than silent.
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Popover, PopoverContent } from "@carbon/react";
import { Ai, Close } from "@carbon/icons-react";
import { AskPulseForm } from "./AskPulseForm";

type ProjectOption = { id: string; title: string };

export function FloatingAskPulse({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const match = pathname.match(/^\/projects\/([^/]+)/);
  const currentProject = match ? (projects.find((p) => p.id === match[1]) ?? null) : null;

  return (
    <div style={{ position: "fixed", right: "1rem", bottom: "3.5rem", zIndex: 2 }}>
      <Popover open={open} onRequestClose={() => setOpen(false)} align="top-end" caret>
        <button
          type="button"
          aria-label={open ? "Close Ask ESTI" : "Ask ESTI"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={{
            width: "3rem",
            height: "3rem",
            borderRadius: "50%",
            background: "var(--cds-button-primary)",
            color: "var(--cds-text-on-color)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
          }}
        >
          {open ? <Close size={20} /> : <Ai size={20} />}
        </button>
        <PopoverContent>
          <div style={{ padding: "1rem", width: "22rem", maxWidth: "calc(100vw - 2rem)", maxHeight: "28rem", overflowY: "auto" }}>
            <p className="cds--type-heading-compact-01" style={{ marginBottom: "0.25rem" }}>
              Ask ESTI
            </p>
            {/* Visible, not silent magic — there's no picker for this any
                more, so this line is the only place the scoping is
                disclosed at all. */}
            {currentProject && (
              <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.75rem" }}>
                Scoped to {currentProject.title}.
              </p>
            )}
            <AskPulseForm defaultProjectId={currentProject?.id} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
