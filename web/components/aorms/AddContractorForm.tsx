"use client";

import { useClosePanel } from "./ContextPanel";
import { NewContractorForm } from "./NewContractorForm";

export function AddContractorForm() {
  const close = useClosePanel();
  return <NewContractorForm onSuccess={close} />;
}
