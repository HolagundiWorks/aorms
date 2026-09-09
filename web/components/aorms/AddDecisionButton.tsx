"use client";

import { useState } from "react";
import { Button } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { SidePanel } from "./SidePanel";
import { NewDecisionForm } from "./NewDecisionForm";

/** Trigger + side panel for logging a new CRIF decision — replaces the
 * form that used to sit permanently inline above the register table. */
export function AddDecisionButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" renderIcon={Add} onClick={() => setOpen(true)}>
        Add decision
      </Button>
      <SidePanel open={open} onClose={() => setOpen(false)} title="Add decision" label="Decisions (CRIF)">
        <NewDecisionForm projectId={projectId} onSuccess={() => setOpen(false)} />
      </SidePanel>
    </>
  );
}
