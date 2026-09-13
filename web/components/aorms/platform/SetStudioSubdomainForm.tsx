"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, TextInput } from "@carbon/react";
import { setStudioSubdomain } from "../../../lib/actions/platform";

/**
 * Enterprise-only, owner-only, on /studios/[studioId] — reserves
 * `studios.subdomain_slug` (validated + gated server-side in
 * setStudioSubdomain; this component doesn't re-check tier/ownership
 * itself, the page only renders it for an eligible owner in the first
 * place, same as every other owner-only control here).
 *
 * 2026-09-14, schema + reservation only — the note below is load-bearing,
 * not boilerplate: nothing makes `<slug>.aorms.in` actually resolve yet
 * (see docs/esti/ROADMAP.md's dated entry for what that needs).
 */
export function SetStudioSubdomainForm({ studioId, currentSlug }: { studioId: string; currentSlug: string | null }) {
  const [slug, setSlug] = useState(currentSlug ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "24rem" }}>
      <TextInput
        id="studio-subdomain"
        labelText="Subdomain"
        placeholder="yourstudio"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
      />
      <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
        {(slug || "yourstudio").toLowerCase()}.aorms.in — reserved for you; full access via this address isn&apos;t wired up yet.
      </p>
      {saved ? (
        <InlineNotification kind="success" title="Reserved" subtitle={`${saved}.aorms.in is now yours.`} lowContrast hideCloseButton />
      ) : null}
      {error ? <InlineNotification kind="error" title="Couldn't reserve" subtitle={error} lowContrast hideCloseButton /> : null}
      <Button
        kind="tertiary"
        size="sm"
        disabled={isPending || !slug.trim()}
        onClick={() => {
          setError(null);
          setSaved(null);
          startTransition(async () => {
            const res = await setStudioSubdomain(studioId, slug);
            if (res.error) setError(res.error);
            else setSaved(slug.trim().toLowerCase());
          });
        }}
      >
        {isPending ? "Saving…" : currentSlug ? "Update" : "Reserve"}
      </Button>
    </div>
  );
}
