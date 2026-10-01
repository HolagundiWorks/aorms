"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Form, InlineNotification, Stack, TextInput } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { requestPasswordReset, type PasswordActionState } from "../../../lib/actions/password-reset";
import { TurnstileWidget } from "../../../components/aorms/security/TurnstileWidget";
import { AuthHead } from "../../../components/aorms/AuthHead";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<PasswordActionState, FormData>(requestPasswordReset, null);
  const success = state && "success" in state;

  return (
    <Form action={formAction}>
      <Stack gap={6}>
        <AuthHead title={<>Reset your password</>} description={<>Enter the email on your AORMS account and we&apos;ll send you a reset link.</>} result="A reset link in your inbox." />

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
            <TurnstileWidget action="reset" />
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
