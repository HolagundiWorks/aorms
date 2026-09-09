"use client";

import { useClosePanel } from "./ContextPanel";
import { NewPurchaseOrderForm } from "./NewPurchaseOrderForm";

type ProjectOption = { id: string; title: string };

export function AddPurchaseOrderForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewPurchaseOrderForm projects={projects} onSuccess={close} />;
}
