"use client";

import { useClosePanel } from "./ContextPanel";
import { NewTeamMemberForm } from "./NewTeamMemberForm";

export function AddTeamMemberForm() {
  const close = useClosePanel();
  return <NewTeamMemberForm onSuccess={close} />;
}
