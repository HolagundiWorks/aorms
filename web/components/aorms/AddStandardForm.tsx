"use client";

import { useClosePanel } from "./ContextPanel";
import { NewStandardForm } from "./NewStandardForm";

export function AddStandardForm() {
  const close = useClosePanel();
  return <NewStandardForm onSuccess={close} />;
}
