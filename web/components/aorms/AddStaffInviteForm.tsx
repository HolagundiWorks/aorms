"use client";

import { useClosePanel } from "./ContextPanel";
import { NewStaffInviteForm } from "./NewStaffInviteForm";

export function AddStaffInviteForm() {
  const close = useClosePanel();
  return <NewStaffInviteForm onSuccess={close} />;
}
