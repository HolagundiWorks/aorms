"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import NextLink from "next/link";
import { platformSignIn, signInWithGoogle, type PlatformActionState } from "../../../lib/actions/platform";
import { offerToSaveCredentials } from "../../../lib/credential-store";
import { AuthHead } from "../../../components/aorms/AuthHead";
import { TurnstileWidget } from "../../../components/aorms/security/TurnstileWidget";

export default function PlatformLoginPage() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(platformSignIn, null);

  return (
    // Centred single column with real top padding (2026-09-30 UI audit: the
    // Grid/Column version sat flush top-left at wide widths).
    <div style={{ maxWidth: "30rem", margin: "0 auto", padding: "4rem 1rem 3rem" }}>
      <div>
        <Stack gap={6}>
          <AuthHead
            title="Sign in to AORMS"
            description="One account for Office Hub and the AORMS Platform — your Office Hub password works here too."
            result="Your office, open on today's work."
          />
          {/* Google sign-in (docs/esti/AORMS-V2-DEVELOPER-GUIDELINES.md §
              5) — the default path per the frozen spec; email/password
              stays available below it, not replaced. */}
          <form action={signInWithGoogle}>
            <Button type="submit" kind="tertiary" style={{ width: "100%", maxInlineSize: "none", justifyContent: "center" }}>
              Continue with Google
            </Button>
          </form>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ flex: 1, borderTop: "1px solid var(--cds-border-subtle)" }} />
            <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
              or
            </span>
            <div style={{ flex: 1, borderTop: "1px solid var(--cds-border-subtle)" }} />
          </div>
        <Form action={formAction} onSubmit={(e) => offerToSaveCredentials(e.currentTarget)}>
          <Stack gap={6}>
            <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
            <PasswordInput
              id="password"
              name="password"
              labelText="Password"
              autoComplete="current-password"
              required
            />
            <TurnstileWidget action="signin" />
            {state?.error ? (
              <InlineNotification kind="error" title="Sign-in failed" subtitle={state.error} lowContrast hideCloseButton />
            ) : null}
            <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <p className="cds--type-body-01">
              Don&apos;t have an AORMS Identity yet? <NextLink href="/platform-signup">Create one</NextLink>
            </p>
          </Stack>
        </Form>
          <dl className="aorms-login-foot">
            <div>
              <dt>System</dt>
              <dd>AORMS</dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>Hub + Platform</dd>
            </div>
            <div>
              <dt>Session</dt>
              <dd>24 h cap</dd>
            </div>
          </dl>
        </Stack>
      </div>
    </div>
  );
}
