"use client";

import { useActionState, useRef } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { Upload } from "@carbon/icons-react";
import { uploadAccountPhoto, type AccountProfileActionState } from "../../../lib/actions/account-profile";

/**
 * Hidden native file input triggered via a Carbon Button — the same
 * permitted pattern used throughout this codebase (CLAUDE.md's own
 * "Hidden file inputs" allowance) rather than a custom drag-drop widget.
 * Submits immediately on file choice (no separate "upload" click) —
 * matches this action's own single-purpose shape.
 */
export function AccountPhotoUpload({ photoUrl }: { photoUrl: string | null }) {
  const [state, formAction, pending] = useActionState<AccountProfileActionState, FormData>(uploadAccountPhoto, null);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={formAction} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <div
        aria-hidden
        style={{
          width: "4rem",
          height: "4rem",
          borderRadius: "50%",
          overflow: "hidden",
          background: "var(--cds-layer-01)",
          border: "1px solid var(--cds-border-subtle)",
          flexShrink: 0,
        }}
      >
        {/* Plain <img>, not next/image — a signed Storage URL, not a static/optimizable asset. */}
        {photoUrl && <img src={photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
      <div>
        <input
          type="file"
          id="photo"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={() => formRef.current?.requestSubmit()}
        />
        <Button
          type="button"
          kind="tertiary"
          size="sm"
          renderIcon={Upload}
          disabled={pending}
          onClick={() => document.getElementById("photo")?.click()}
        >
          {pending ? "Uploading…" : "Upload photo"}
        </Button>
        {state?.error ? (
          <InlineNotification kind="error" title="Couldn't upload" subtitle={state.error} lowContrast hideCloseButton style={{ marginTop: "0.5rem" }} />
        ) : null}
      </div>
    </form>
  );
}
