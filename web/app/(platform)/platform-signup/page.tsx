"use client";

import { useActionState } from "react";
import { Button, Column, Form, Grid, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import NextLink from "next/link";
import { platformSignUp, signInWithGoogle, type PlatformActionState } from "../../../lib/actions/platform";

export default function PlatformSignUpPage() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(platformSignUp, null);

  return (
    <Grid>
      <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
        <Stack gap={6}>
          <div>
            {/* Link back to the landing page (2026-09-10) — same gap fixed
                on /login and /platform-login, for consistency. */}
            <NextLink href="/" aria-label="AORMS home" style={{ display: "inline-block", marginBottom: "1.5rem" }}>
              {/* Plain <img>, not next/image — a fixed brand asset. */}
              <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
            </NextLink>
            <h1 className="cds--type-heading-04">Create your AORMS Platform account</h1>
            <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
              A portable personal account — one AORMS-U- handle across every studio and company you work with.
            </p>
          </div>
          {/* Google sign-in also creates the account on first use — no
              separate "sign up with Google" step (docs/esti/AORMS-V2-
              DEVELOPER-GUIDELINES.md § 5). */}
          <form action={signInWithGoogle}>
            <Button type="submit" kind="tertiary" style={{ width: "100%", justifyContent: "center" }}>
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
        <Form action={formAction}>
          <Stack gap={6}>
            <TextInput id="fullName" name="fullName" labelText="Full name" required />
            <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
            <PasswordInput
              id="password"
              name="password"
              labelText="Password"
              autoComplete="new-password"
              required
            />
            {state?.error ? (
              <InlineNotification kind="error" title="Sign-up failed" subtitle={state.error} lowContrast hideCloseButton />
            ) : null}
            <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </Button>
            <p className="cds--type-body-01">
              Already have an AORMS Identity? <NextLink href="/platform-login">Sign in</NextLink>
            </p>
          </Stack>
        </Form>
        </Stack>
      </Column>
    </Grid>
  );
}
