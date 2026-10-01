"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, InlineNotification, Stack, TextInput } from "@carbon/react";
import { createClient } from "../../../lib/platform/client";
import { AuthHead } from "../../../components/aorms/AuthHead";

type Phase = "loading" | "enrol" | "verify" | "signed-out";

/**
 * Staff two-factor (TOTP) enrolment + verification (2026-10-01 audit R3). Uses
 * Supabase Auth MFA on the Platform project. Reachable from any portal host
 * (shared path). Enrol once with an authenticator app, then enter a code each
 * session; `/admin/*` requires it when STAFF_MFA_REQUIRED=true.
 */
export default function PlatformMfaPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return setPhase("signed-out");
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.[0];
      if (verified) {
        setFactorId(verified.id);
        setPhase("verify");
      } else {
        setPhase("enrol");
      }
    })();
  }, []);

  async function startEnrol() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `AORMS staff ${new Date().toISOString().slice(0, 10)}` });
    setBusy(false);
    if (err || !data) return setError(err?.message ?? "Could not start enrolment.");
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
  }

  async function submitCode() {
    if (!factorId) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (err) return setError(err.message);
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div style={{ maxWidth: "30rem", margin: "0 auto", padding: "4rem 1rem 3rem" }}>
      <Stack gap={6}>
        <AuthHead title="Two-factor verification" description="Platform staff sign in with a one-time code from an authenticator app." result="Staff access, double-checked." />
        {phase === "loading" && <p className="cds--type-body-01">Loading…</p>}
        {phase === "signed-out" && (
          <InlineNotification kind="info" title="Sign in first" subtitle="Sign in at /platform-login, then return here." lowContrast hideCloseButton />
        )}
        {phase === "enrol" && !qr && (
          <>
            <p className="cds--type-body-01">No authenticator is set up for this account yet.</p>
            <Button onClick={startEnrol} disabled={busy}>
              {busy ? "Starting…" : "Set up authenticator app"}
            </Button>
          </>
        )}
        {phase === "enrol" && qr && (
          <>
            <p className="cds--type-body-01">Scan this code with your authenticator app, then enter the 6-digit code it shows.</p>
            {/* QR is a data: URI SVG from Supabase Auth, so next/image adds nothing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="Authenticator QR code" width={192} height={192} />
            {secret && (
              <p className="cds--type-helper-text-01">
                Can&apos;t scan? Enter this key manually: <code>{secret}</code>
              </p>
            )}
          </>
        )}
        {(phase === "verify" || (phase === "enrol" && qr)) && (
          <>
            <TextInput
              id="mfa-code"
              labelText="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <Button onClick={submitCode} disabled={busy || code.length !== 6}>
              {busy ? "Verifying…" : "Verify"}
            </Button>
          </>
        )}
        {error && <InlineNotification kind="error" title="Verification failed" subtitle={error} lowContrast hideCloseButton />}
      </Stack>
    </div>
  );
}
