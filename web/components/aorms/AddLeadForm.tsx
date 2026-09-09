"use client";

import { useClosePanel } from "./ContextPanel";
import { NewLeadForm } from "./NewLeadForm";

export function AddLeadForm() {
  const close = useClosePanel();
  return <NewLeadForm onSuccess={close} />;
}
