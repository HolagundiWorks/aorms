"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, Form, InlineNotification, PasswordInput, Stack } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { updatePassword, type PasswordActionState } from "../../../lib/actions/password-reset";

/**
 * The completion half of both the recovery flow (§22) and invite
 * acceptance (§23) — /auth/callback lands both kinds of link here after
 * exchanging the code for a real session; `mode` only changes the
 * copy, not the mechanism (both are "set a password for the account
 * you're now signed into"). useSearchParams needs a Suspense boundary
 * (see the default export below).
 */
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("mode") === "invite";
  const [state, formAction, pending] = useActionState<PasswordActionState, FormData>(updatePassword, null);

  return (
    <Form action={formAction}>
      <Stack gap={6}>
        <div>
          <Link href="/" aria-label="AORMS home">
            <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto", marginBottom: "1.5rem" }} />
          </Link>
          <h1 className="cds--type-heading-04">{isInvite ? "Set your password" : "Choose a new password"}</h1>
          <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
            {isInvite
              ? "Welcome to AORMS — set a password to finish activating your account."
              : "Enter a new password for your AORMS account."}
          </p>
        </div>

        <PasswordInput id="password" name="password" labelText="New password" autoComplete="new-password" required minLength={8} />
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          labelText="Confirm password"
          autoComplete="new-password"
          required
          minLength={8}
        />

        {state && "error" in state ? (
          <InlineNotification kind="error" title="Couldn't set password" subtitle={state.error} lowContrast hideCloseButton />
        ) : null}

        <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
          {pending ? "Saving…" : isInvite ? "Activate account" : "Save new password"}
        </Button>
      </Stack>
    </Form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
