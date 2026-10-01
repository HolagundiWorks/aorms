"use client";

import NextLink from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, Form, InlineNotification, PasswordInput, Stack } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { updatePlatformPassword, type PlatformPasswordActionState } from "../../../lib/actions/platform-password-reset";
import { AuthHead } from "../../../components/aorms/AuthHead";

/**
 * The completion half of two flows — `/platform-auth-callback` lands
 * here after exchanging an emailed code for a real platform session,
 * either the admin-triggered SysDeX reset, or (2026-09-28) a ConnectDeX
 * company invite (`lib/actions/connectdex.ts`'s `inviteUserByEmail`) —
 * `mode` only changes the copy, not the mechanism, same as the Office
 * Hub's own `app/(auth)/reset-password/page.tsx`. `useSearchParams`
 * needs a Suspense boundary (see the default export below).
 */
function PlatformResetPasswordForm() {
  const searchParams = useSearchParams();
  const isInvite = searchParams.get("mode") === "invite";
  const [state, formAction, pending] = useActionState<PlatformPasswordActionState, FormData>(updatePlatformPassword, null);

  return (
    <div className="aorms-auth">
        <Form action={formAction}>
          <Stack gap={6}>
            <AuthHead title={<>{isInvite ? "Set your password" : "Choose a new password"}</>} description={<>{isInvite
                  ? "Welcome to AORMS ConnectDeX — set a password to finish activating your account."
                  : "Enter a new password for your AORMS Platform account."}</>} result="A password only you know, and access restored." />

            <PasswordInput id="password" name="password" labelText="New password" autoComplete="new-password" required minLength={8} />
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              labelText="Confirm password"
              autoComplete="new-password"
              required
              minLength={8}
            />

            {state?.error ? (
              <InlineNotification kind="error" title="Couldn't set password" subtitle={state.error} lowContrast hideCloseButton />
            ) : null}

            <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
              {pending ? "Saving…" : isInvite ? "Activate account" : "Save new password"}
            </Button>
          </Stack>
        </Form>
      </div>
  );
}

export default function PlatformResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PlatformResetPasswordForm />
    </Suspense>
  );
}
