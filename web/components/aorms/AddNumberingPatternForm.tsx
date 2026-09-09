"use client";

import { useClosePanel } from "./ContextPanel";
import { NewNumberingPatternForm } from "./NewNumberingPatternForm";

export function AddNumberingPatternForm() {
  const close = useClosePanel();
  return <NewNumberingPatternForm onSuccess={close} />;
}
