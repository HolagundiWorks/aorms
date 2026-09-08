"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, TextInput } from "@carbon/react";
import { updateMyName } from "../../lib/actions/users";

/**
 * Inline "edit my own name" — shown only on the signed-in user's own row
 * in /users (see that page's own header comment for why this had no path
 * at all before migration 0031). Everyone can use this, including OWNER —
 * "profiles: owner manages" only ever covered updating *someone else's*
 * row, not a self-edit.
 */
export function MyNameEditor({ initialName }: { initialName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>{initialName || "—"}</span>
        <Button size="sm" kind="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
      <TextInput
        id="my-name"
        labelText=""
        hideLabel
        size="sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await updateMyName(name);
            if (res.error) setError(res.error);
            else setEditing(false);
          });
        }}
      >
        {isPending ? "Saving…" : "Save"}
      </Button>
      <Button
        size="sm"
        kind="ghost"
        disabled={isPending}
        onClick={() => {
          setName(initialName);
          setError(null);
          setEditing(false);
        }}
      >
        Cancel
      </Button>
      {error && <InlineNotification kind="error" title="Couldn't save" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
