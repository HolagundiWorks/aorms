"use client";

import { useActionState } from "react";
import { Button, InlineNotification, Tile } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { switchToFirm, joinOrProvisionStudio, type StudioAccessActionState } from "../../lib/actions/studio-access";

/** One row in the "your studios" list — switches the caller's active firm. */
export function SwitchFirmTile({ firmId, name, role }: { firmId: string; name: string; role: string }) {
  const [state, formAction, pending] = useActionState<StudioAccessActionState, FormData>(switchToFirm, null);
  return (
    <Tile>
      <form action={formAction}>
        <input type="hidden" name="firmId" value={firmId} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p className="cds--type-heading-compact-01">{name}</p>
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
              {role}
            </p>
          </div>
          <Button kind="tertiary" type="submit" renderIcon={ArrowRight} disabled={pending}>
            {pending ? "Entering…" : "Continue"}
          </Button>
        </div>
        {state?.error ? (
          <InlineNotification kind="error" subtitle={state.error} lowContrast hideCloseButton style={{ marginTop: "0.5rem" }} />
        ) : null}
      </form>
    </Tile>
  );
}

/** One row in the "available to set up" list — provisions or joins a Studio that has no firm membership yet. */
export function JoinStudioTile({ publicId, name }: { publicId: string; name: string }) {
  const [state, formAction, pending] = useActionState<StudioAccessActionState, FormData>(joinOrProvisionStudio, null);
  return (
    <Tile>
      <form action={formAction}>
        <input type="hidden" name="publicId" value={publicId} />
        <input type="hidden" name="name" value={name} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p className="cds--type-heading-compact-01">{name}</p>
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
              Set up Office Hub for this studio
            </p>
          </div>
          <Button kind="tertiary" type="submit" renderIcon={ArrowRight} disabled={pending}>
            {pending ? "Setting up…" : "Set up"}
          </Button>
        </div>
        {state?.error ? (
          <InlineNotification kind="error" subtitle={state.error} lowContrast hideCloseButton style={{ marginTop: "0.5rem" }} />
        ) : null}
      </form>
    </Tile>
  );
}
