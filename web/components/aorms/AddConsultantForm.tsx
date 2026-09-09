"use client";

import { useClosePanel } from "./ContextPanel";
import { NewConsultantForm } from "./NewConsultantForm";

export function AddConsultantForm() {
  const close = useClosePanel();
  return <NewConsultantForm onSuccess={close} />;
}
