"use client";

import { useClosePanel } from "./ContextPanel";
import { NewTransmittalForm } from "./NewTransmittalForm";

type ProjectOption = { id: string; title: string };

export function AddTransmittalForm({ projects }: { projects: ProjectOption[] }) {
  const close = useClosePanel();
  return <NewTransmittalForm projects={projects} onSuccess={close} />;
}
