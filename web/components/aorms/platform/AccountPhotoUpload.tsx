"use client";

import { useActionState, useRef } from "react";
import Image from "next/image";
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
        {/* 2026-09-14 — switched to next/image (images.remotePatterns in
            next.config.mjs allows *.supabase.co): the only real user-
            content image in the app (every other <img> in this codebase
            is a small fixed brand asset) — this one is a full-resolution
            upload shrunk into a 64px avatar purely via CSS before this,
            downloading far more bytes than the avatar ever displays. */}
        {photoUrl && <Image src={photoUrl} alt="" width={64} height={64} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
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
