"use client";

import { useActionState } from "react";
import { Button, Column, Form, Grid, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import NextLink from "next/link";
import { platformSignUp, type PlatformActionState } from "../../../lib/actions/platform";

export default function PlatformSignUpPage() {
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(platformSignUp, null);

  return (
    <Grid>
      <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
        <Form action={formAction}>
          <Stack gap={6}>
            <div>
              <h1 className="cds--type-heading-04">Create your AORMS Identity</h1>
              <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                A portable personal account — one AORMS-U- handle across every company you work with.
              </p>
            </div>
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
      </Column>
    </Grid>
  );
}
