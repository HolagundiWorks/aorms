"use client";

import { useClosePanel } from "./ContextPanel";
import { NewOfficeTemplateForm } from "./NewOfficeTemplateForm";

export function AddOfficeTemplateForm() {
  const close = useClosePanel();
  return <NewOfficeTemplateForm onSuccess={close} />;
}
