"use client";

import { useClosePanel } from "./ContextPanel";
import { NewTeamForm } from "./NewTeamForm";

export function AddTeamForm() {
  const close = useClosePanel();
  return <NewTeamForm onSuccess={close} />;
}
