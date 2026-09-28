"use client";

import NextLink from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { Button, Column, Form, Grid, InlineNotification, PasswordInput, Stack } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { updatePlatformPassword, type PlatformPasswordActionState } from "../../../lib/actions/platform-password-reset";

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
    <Grid>
      <Column sm={4} md={6} lg={8} style={{ margin: "0 auto" }}>
        <Form action={formAction}>
          <Stack gap={6}>
            <div>
              <NextLink href="/" aria-label="AORMS home" style={{ display: "inline-block", marginBottom: "1.5rem" }}>
                <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
              </NextLink>
              <h1 className="cds--type-heading-04">{isInvite ? "Set your password" : "Choose a new password"}</h1>
              <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                {isInvite
                  ? "Welcome to AORMS ConnectDeX — set a password to finish activating your account."
                  : "Enter a new password for your AORMS Platform account."}
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

            {state?.error ? (
              <InlineNotification kind="error" title="Couldn't set password" subtitle={state.error} lowContrast hideCloseButton />
            ) : null}

            <Button type="submit" renderIcon={ArrowRight} disabled={pending}>
              {pending ? "Saving…" : isInvite ? "Activate account" : "Save new password"}
            </Button>
          </Stack>
        </Form>
      </Column>
    </Grid>
  );
}

export default function PlatformResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <PlatformResetPasswordForm />
    </Suspense>
  );
}
