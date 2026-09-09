"use client";

import { useClosePanel } from "./ContextPanel";
import { NewClientForm } from "./NewClientForm";

export function AddClientForm() {
  const close = useClosePanel();
  return <NewClientForm onSuccess={close} />;
}
