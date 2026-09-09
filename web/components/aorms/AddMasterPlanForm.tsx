"use client";

import { useClosePanel } from "./ContextPanel";
import { NewMasterPlanForm } from "./NewMasterPlanForm";

export function AddMasterPlanForm() {
  const close = useClosePanel();
  return <NewMasterPlanForm onSuccess={close} />;
}
