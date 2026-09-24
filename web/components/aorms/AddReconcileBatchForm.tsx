"use client";

import { useClosePanel } from "./ContextPanel";
import { NewReconcileBatchForm } from "./NewReconcileBatchForm";

export function AddReconcileBatchForm() {
  const close = useClosePanel();
  return <NewReconcileBatchForm onSuccess={close} />;
}
