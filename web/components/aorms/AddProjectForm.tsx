"use client";

import { useClosePanel } from "./ContextPanel";
import { NewProjectForm } from "./NewProjectForm";

type ClientOption = { id: string; name: string };

export function AddProjectForm({ clients }: { clients: ClientOption[] }) {
  const close = useClosePanel();
  return <NewProjectForm clients={clients} onSuccess={close} />;
}
