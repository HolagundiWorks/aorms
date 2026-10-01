"use client";

import { useRef, useState, useTransition } from "react";
import { Button, InlineNotification } from "@carbon/react";
import { removeProjectCover, setProjectCover } from "../../lib/actions/project-covers";

/**
 * Upload / replace / remove a project's cover image (write-tier only — the
 * parent doesn't render this for read-only users, and the Server Action
 * re-checks). Hidden file input triggered by a Carbon Button (a permitted
 * pattern); the image is validated server-side (type, magic bytes, 5MB).
 */
export function CoverImageControl({ projectId, hasCover }: { projectId: string; hasCover: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const report = (res: { error: string } | { ok: string } | null) => {
    if (!res) return;
    setMessage("error" in res ? { kind: "error", text: res.error } : { kind: "success", text: res.ok });
  };

  return (
    <div style={{ display: "grid", gap: "0.5rem", marginBlockStart: "0.75rem" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ""; // allow re-selecting the same file later
          if (!file) return;
          const fd = new FormData();
          fd.set("image", file);
          setMessage(null);
          startTransition(async () => report(await setProjectCover(projectId, fd)));
        }}
      />
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <Button size="sm" kind="tertiary" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "Working…" : hasCover ? "Replace cover image" : "Add cover image"}
        </Button>
        {hasCover && (
          <Button size="sm" kind="ghost" disabled={pending} onClick={() => startTransition(async () => report(await removeProjectCover(projectId)))}>
            Remove
          </Button>
        )}
      </div>
      {message && (
        <InlineNotification
          kind={message.kind}
          title={message.kind === "error" ? "Couldn't update image" : "Done"}
          subtitle={message.text}
          lowContrast
          hideCloseButton
        />
      )}
    </div>
  );
}
