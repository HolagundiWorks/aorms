"use client";

import { Button } from "@carbon/react";
import { Printer } from "@carbon/icons-react";

/** Browser print dialog — "Save as PDF" in the destination picker is how this doubles as a CV export, no server-side PDF render needed. */
export function ResumePrintButton() {
  return (
    <Button kind="tertiary" size="sm" renderIcon={Printer} onClick={() => window.print()}>
      Print / Save as PDF
    </Button>
  );
}
