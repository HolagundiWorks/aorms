"use client";

import { useClosePanel } from "./ContextPanel";
import { NewContractForm } from "./NewContractForm";

type ProjectOption = { id: string; title: string };

export function AddContractForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewContractForm projects={projects} onSuccess={close} />;
}
