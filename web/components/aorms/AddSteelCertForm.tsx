"use client";

import { useClosePanel } from "./ContextPanel";
import { NewSteelCertForm } from "./NewSteelCertForm";

type ProjectOption = { id: string; title: string };

export function AddSteelCertForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewSteelCertForm projects={projects} onSuccess={close} />;
}
