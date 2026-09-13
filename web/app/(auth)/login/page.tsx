"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, Form, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { signIn, type AuthActionState } from "../../../lib/actions/auth";

function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signIn, null);
  // /auth/callback redirects here with ?error=... when a recovery/invite
  // link was expired, already used, or invalid (2026-09-14 remediation) —
  // without reading it, that message silently vanished; confirmed live
  // (the callback route did carry it in the URL, this page just never
  // looked). useSearchParams needs a Suspense boundary (see the default
  // export below) — Next.js bails the whole page from static
  // prerendering otherwise.
  const callbackError = useSearchParams().get("error");

  return (
    <Form action={formAction}>
      <Stack gap={6}>
        <div>
          {/* Wrapped in a Link back to the landing page (2026-09-10) — was a
              dead end before this: nothing on this page linked anywhere but
              itself, confirmed live as a real gap, not assumed. */}
          <Link href="/" aria-label="AORMS home">
            {/* Plain <img>, not next/image — a fixed brand asset, not user content. */}
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto", marginBottom: "1.5rem" }} />
          </Link>
          <h1 className="cds--type-heading-04">Sign in to AORMS</h1>
          <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Office management for architecture practices.
          </p>
        </div>
        <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
        <div>
          <PasswordInput
            id="password"
            name="password"
            labelText="Password"
            autoComplete="current-password"
            required
          />
          {/* 2026-09-14 remediation — this page had no way to reach a
              password reset at all; confirmed as a real, missing flow
              (no forgot-password page existed anywhere in the app). */}
          <Link href="/forgot-password" className="cds--type-body-01" style={{ display: "inline-block", marginTop: "0.5rem" }}>
            Forgot password?
          </Link>
        </div>
        {state?.error ? (
          <InlineNotification kind="error" title="Sign-in failed" subtitle={state.error} lowContrast hideCloseButton />
        ) : callbackError ? (
          <InlineNotification kind="error" title="Link problem" subtitle={callbackError} lowContrast hideCloseButton />
        ) : null}
        <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </Stack>
    </Form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
