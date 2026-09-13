"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { requestPasswordReset, type PasswordActionState } from "../../../lib/actions/password-reset";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<PasswordActionState, FormData>(requestPasswordReset, null);
  const success = state && "success" in state;

  return (
    <Form action={formAction}>
      <Stack gap={6}>
        <div>
          <Link href="/" aria-label="AORMS home">
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto", marginBottom: "1.5rem" }} />
          </Link>
          <h1 className="cds--type-heading-04">Reset your password</h1>
          <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            Enter the email on your AORMS account and we&apos;ll send you a reset link.
          </p>
        </div>

        {success ? (
          <InlineNotification
            kind="success"
            title="Check your email"
            subtitle="If that address has an AORMS account, a reset link is on its way. It's valid for a limited time — request another if it expires."
            hideCloseButton
            lowContrast
          />
        ) : (
          <>
            <TextInput id="email" name="email" labelText="Email" type="email" autoComplete="email" required />
            {state?.error ? (
              <InlineNotification kind="error" title="Couldn't send reset link" subtitle={state.error} lowContrast hideCloseButton />
            ) : null}
            <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </>
        )}

        <Link href="/login" className="cds--type-body-01">
          Back to sign in
        </Link>
      </Stack>
    </Form>
  );
}
