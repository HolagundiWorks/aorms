"use client";

import { useActionState } from "react";
import { Button, Column, Form, Grid, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import NextLink from "next/link";
import { platformSignIn, type PlatformActionState } from "../../../lib/actions/platform";

export default function PlatformLoginPage() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(platformSignIn, null);

  return (
    <Grid>
      <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
        <Form action={formAction}>
          <Stack gap={6}>
            <div>
              {/* Link back to the landing page (2026-09-10) — this page had
                  no way back to / at all, confirmed live as a real gap. */}
              <NextLink href="/" aria-label="AORMS home" style={{ display: "inline-block", marginBottom: "1.5rem" }}>
                {/* Plain <img>, not next/image — a fixed brand asset. */}
                <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
              </NextLink>
              <h1 className="cds--type-heading-04">Sign in to your AORMS Platform account</h1>
              <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                One personal, portable account across the Identity Portal, ConnectDeX Portal, and SysDeX.
              </p>
            </div>
            <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
            <PasswordInput
              id="password"
              name="password"
              labelText="Password"
              autoComplete="current-password"
              required
            />
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
      </Column>
    </Grid>
  );
}
