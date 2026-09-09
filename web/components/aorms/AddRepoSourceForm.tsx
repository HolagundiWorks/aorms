"use client";

import { useClosePanel } from "./ContextPanel";
import { NewRepoSourceForm } from "./NewRepoSourceForm";

export function AddRepoSourceForm() {
  const close = useClosePanel();
  return <NewRepoSourceForm onSuccess={close} />;
}
