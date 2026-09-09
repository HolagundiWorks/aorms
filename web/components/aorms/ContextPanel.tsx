"use client";

import { createContext, useContext, useState } from "react";
import { Button, IconButton, type ButtonProps } from "@carbon/react";
import { Close } from "@carbon/icons-react";

/**
 * AORMS's own contextual form-panel pattern — a custom composition on top
 * of Carbon, not a Carbon component itself (per the AORMS Custom Carbon
 * Page & Form Composition Standard, §13-30): create/edit forms open in a
 * **left-docked, non-modal split pane** beside the page's own content,
 * which stays fully visible and interactive — not `SidePanel.tsx`'s
 * earlier (2026-09-09, same day) `ComposedModal`-docked-right approach,
 * which was a real modal: backdrop, focus trap, main content blocked.
 * That was the wrong tool for this pattern and is removed; `ComposedModal`
 * stays right for what it's actually for — a future `ConfirmDialog`
 * (§26: "Delete drawing?" should be a dialog, "Create drawing" should not).
 *
 * `ContextPanelLayout` owns open/close state via context so the trigger
 * button, the panel, and the main content can each sit wherever they
 * naturally belong in a page's own JSX tree (the trigger is typically deep
 * inside the content next to a table; the panel and content are siblings
 * at the layout root) without prop-drilling `open`/`onClose` through a
 * Server Component page that can't hold that state itself.
 */
const PanelContext = createContext<{ open: boolean; setOpen: (open: boolean) => void } | null>(null);

export function useContextPanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("useContextPanel must be used inside <ContextPanelLayout>");
  return ctx;
}

export function ContextPanelLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PanelContext.Provider value={{ open, setOpen }}>
      <div className="aorms-context-panel-layout">{children}</div>
    </PanelContext.Provider>
  );
}

/** Wraps the page's own main content (breadcrumb/H1/KPI/tabs/toolbar/table)
 * — the flexible side of the split, not the panel. */
export function ContextPanelContent({ children }: { children: React.ReactNode }) {
  return <div className="aorms-context-panel-layout__content">{children}</div>;
}

/**
 * A Button that opens the panel — place it wherever the page's own
 * "Create"/"Add" action naturally belongs, typically from a Server
 * Component page. `renderIcon` is deliberately excluded: it's a
 * function-valued Button prop, and passing a bare component reference
 * from a Server Component into this Client Component's props crosses
 * the RSC boundary with a non-serializable value ("Functions cannot be
 * passed directly to Client Components...") — hit this exact error
 * once already (2026-09-09) with `renderIcon={Add}`. Carbon's own icon
 * slot isn't reachable this way from a server caller; skip the icon
 * (matches the AORMS composition standard's own plain-text button
 * examples) rather than reintroducing the crash.
 */
export function ContextPanelTrigger({ children, ...buttonProps }: Omit<ButtonProps<"button">, "onClick" | "renderIcon">) {
  const { setOpen } = useContextPanel();
  return (
    <Button {...buttonProps} onClick={() => setOpen(true)}>
      {children}
    </Button>
  );
}

export function ContextPanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useContextPanel();
  if (!open) return null;

  return (
    <div className="aorms-context-panel">
      <div className="aorms-context-panel__header">
        <div>
          <h2 className="cds--type-heading-03 cds--type-semibold">{title}</h2>
          {description && (
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
              {description}
            </p>
          )}
        </div>
        <IconButton kind="ghost" label="Close" size="sm" onClick={() => setOpen(false)}>
          <Close />
        </IconButton>
      </div>
      <div className="aorms-context-panel__content">{children}</div>
    </div>
  );
}

/** Convenience: consumes the panel's own close handler — for a form's
 * `onSuccess` callback, so it can close the panel it lives inside without
 * that form needing to know it's inside one. */
export function useClosePanel(): () => void {
  const { setOpen } = useContextPanel();
  return () => setOpen(false);
}
