"use client";

import { useClosePanel } from "./ContextPanel";
import { NewInvoiceForm } from "./NewInvoiceForm";

type ProjectOption = { id: string; title: string };
type ClientOption = { id: string; name: string };

export function AddInvoiceForm({ projects, clients }: { projects: ProjectOption[]; clients: ClientOption[] }) {
  const close = useClosePanel();
  return <NewInvoiceForm projects={projects} clients={clients} onSuccess={close} />;
}
