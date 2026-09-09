"use client";

import { useClosePanel } from "./ContextPanel";
import { NewEstimateForm } from "./NewEstimateForm";

type ProjectOption = { id: string; title: string };
type RateBookOption = { id: string; name: string };

export function AddEstimateForm({ projects, rateBooks }: { projects: ProjectOption[]; rateBooks: RateBookOption[] }) {
  const close = useClosePanel();
  return <NewEstimateForm projects={projects} rateBooks={rateBooks} onSuccess={close} />;
}
