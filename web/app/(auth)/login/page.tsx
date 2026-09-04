"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, PasswordInput, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { signIn, type AuthActionState } from "../../../lib/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(signIn, null);

  return (
    <Form action={formAction}>
      <Stack gap={6}>
        <div>
          <h1 className="cds--type-heading-04">Sign in to AORMS</h1>
          <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Office management for architecture practices.
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
      </Stack>
    </Form>
  );
}
