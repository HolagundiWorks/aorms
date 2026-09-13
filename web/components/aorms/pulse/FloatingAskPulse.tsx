"use client";

/**
 * Floating "Ask Pulse" button (2026-09-14, explicit request) — the same
 * deterministic NL box that already lives in Pulse's own Task Prediction
 * panel (AskPulseForm.tsx), now also reachable from every screen, not
 * just /pulse. Same Popover/PopoverContent pattern every other header
 * widget uses (HeaderWellness.tsx etc.), just anchored to a fixed
 * position instead of the header bar. Sits directly above
 * BrandWatermark.tsx in the same bottom-right corner, with enough
 * clearance that the two never overlap.
 *
 * Screen-specific context (2026-09-14, explicit request: "the current
 * screen will give the pulse context") — when the URL is a project's own
 * page (/projects/<id>, /projects/<id>/brief, etc.), that project is
 * pre-selected in AskPulseForm's own project selector, so a question
 * asked while looking at a project is scoped to it without an extra
 * click. Matched against the real `projects` list, not just parsed off
 * the URL shape, so a non-project route that happens to start with
 * "/projects/" some other way never falsely triggers this. `key={...}`
 * forces the form to remount (and re-apply its defaultValue) when
 * navigating from one project's pages to another's, since Carbon's
 * Select — like a plain <select> — only reads `defaultValue` once, at
 * mount, not on every prop change.
 */
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Popover, PopoverContent } from "@carbon/react";
import { ChatBot, Close } from "@carbon/icons-react";
import { AskPulseForm } from "./AskPulseForm";

type ProjectOption = { id: string; title: string };

export function FloatingAskPulse({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const match = pathname.match(/^\/projects\/([^/]+)/);
  const currentProject = match ? (projects.find((p) => p.id === match[1]) ?? null) : null;

  return (
    <div style={{ position: "fixed", right: "1rem", bottom: "3.5rem", zIndex: 2 }}>
      <Popover open={open} onRequestClose={() => setOpen(false)} align="top-end" caret highContrast>
        <button
          type="button"
          aria-label={open ? "Close Ask Pulse" : "Ask Pulse"}
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
          {open ? <Close size={20} /> : <ChatBot size={20} />}
        </button>
        <PopoverContent>
          <div style={{ padding: "1rem", width: "22rem", maxWidth: "calc(100vw - 2rem)", maxHeight: "28rem", overflowY: "auto" }}>
            <p className="cds--type-heading-compact-01" style={{ marginBottom: "0.25rem" }}>
              Ask Pulse
            </p>
            {/* Visible, not silent magic — the pre-selection below is
                real (it changes what gets asked), so say so rather than
                have it look like an unexplained default. */}
            {currentProject && (
              <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.75rem" }}>
                Scoped to {currentProject.title} — change the project below to ask about something else.
              </p>
            )}
            <AskPulseForm key={currentProject?.id ?? "none"} projects={projects} defaultProjectId={currentProject?.id} />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
