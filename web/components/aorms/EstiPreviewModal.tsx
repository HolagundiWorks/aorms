"use client";

/**
 * Intelligence section's "preview what ESTI surfaces" modal (2026-09-10)
 * — a stand-in for a real product screenshot (landing-page suggestion #1
 * from the earlier review round, still not built). Needs open/close
 * state, so it's a Client Component wrapper — same RSC-boundary reason
 * LandingButtons.tsx already documents for Carbon `Button`/`Modal`.
 */
import { useState } from "react";
import { Button, InlineNotification, Modal, Stack } from "@carbon/react";
import { View } from "@carbon/icons-react";
import { ESTI, ESTI_PREVIEW_ITEMS } from "../../lib/marketing-content";

export function EstiPreviewModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button kind="tertiary" renderIcon={View} onClick={() => setOpen(true)}>
        Preview what {ESTI.name} surfaces
      </Button>
      <Modal
        open={open}
        onRequestClose={() => setOpen(false)}
        modalLabel={ESTI.name}
        modalHeading="What lands on your desk this morning"
        passiveModal
      >
        <p className="cds--type-body-01" style={{ marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}>
          Illustrative example, not live data — the same kind of items {ESTI.name} would surface from your own studio's
          records.
        </p>
        <Stack gap={4}>
          {ESTI_PREVIEW_ITEMS.map((item) => (
            <InlineNotification
              key={item.title}
              kind={item.kind}
              title={item.title}
              subtitle={item.subtitle}
              hideCloseButton
              lowContrast
            />
          ))}
        </Stack>
      </Modal>
    </>
  );
}
