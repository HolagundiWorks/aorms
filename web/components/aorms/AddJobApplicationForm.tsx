"use client";

import { useClosePanel } from "./ContextPanel";
import { NewJobApplicationForm } from "./NewJobApplicationForm";

export function AddJobApplicationForm() {
  const close = useClosePanel();
  return <NewJobApplicationForm onSuccess={close} />;
}
