"use client";

import { ComposedModal, ModalHeader, ModalBody } from "@carbon/react";

/**
 * Generic slide-in side panel for forms. Carbon has no stock "drawer"/
 * "side panel" component — confirmed against the installed @carbon/react
 * (1.115.0: no `SidePanel`/`Drawer` export) and this repo doesn't depend on
 * `@carbon/ibm-products` either — so this follows CLAUDE.md's own governing
 * rule for exactly this situation ("if Carbon omits a component, use the
 * nearest Carbon pattern"): a stock `ComposedModal`, positioned via
 * `containerClassName` (a real prop, not a restyle) rather than a bespoke
 * component. Every control rendered inside a panel is still literally
 * stock Carbon (`TextInput`/`Select`/`Button`/...); only the outer
 * container's position/size is overridden, in `globals.scss`'s
 * `.aorms-side-panel__container` rule. Below Carbon's own `md` breakpoint
 * this is indistinguishable from an ordinary full-screen Carbon modal —
 * Carbon's existing small-viewport behavior, left untouched.
 */
export function SidePanel({
  open,
  onClose,
  title,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <ComposedModal
      open={open}
      onClose={() => {
        onClose();
        return true;
      }}
      className="aorms-side-panel"
      containerClassName="aorms-side-panel__container"
    >
      <ModalHeader label={label} title={title} />
      <ModalBody hasForm>{children}</ModalBody>
    </ComposedModal>
  );
}
