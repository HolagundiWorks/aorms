"use client";

import { useId, useState, useTransition } from "react";
import { Button, InlineNotification, TextInput } from "@carbon/react";

/**
 * Inline "provision a portal login" row — email input + Invite button,
 * calling a Server Action already bound to the owning contractor/
 * consultant id. Shared by /contractors and /consultants; each passes its
 * own bound inviteContractorLogin/inviteConsultantLogin.
 */
export function ProvisionPortalLoginForm({ action }: { action: (email: string) => Promise<{ error?: string }> }) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <span className="cds--type-body-01" style={{ color: "var(--cds-support-success)" }}>
        Invite sent
      </span>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", flexWrap: "wrap", minWidth: "16rem" }}>
      <TextInput
        id={`portal-login-email-${id}`}
        labelText=""
        hideLabel
        size="sm"
        placeholder="email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button
        size="sm"
        disabled={isPending || !email.trim()}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const res = await action(email);
            if (res.error) setError(res.error);
            else setDone(true);
          });
        }}
      >
        {isPending ? "Inviting…" : "Invite"}
      </Button>
      {error && <InlineNotification kind="error" title="Couldn't invite" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
