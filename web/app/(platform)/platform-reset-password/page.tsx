"use client";

import NextLink from "next/link";
import { useActionState } from "react";
import { Button, Column, Form, Grid, InlineNotification, PasswordInput, Stack } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";
import { updatePlatformPassword, type PlatformPasswordActionState } from "../../../lib/actions/platform-password-reset";

/**
 * The completion half of the AORMS Platform's admin-triggered password
 * reset — `/platform-auth-callback` lands here after exchanging the
 * emailed code for a real platform session. Same shape as the Office
 * Hub's own `app/(auth)/reset-password/page.tsx`, no `mode=invite`
 * variant (there's no platform-side self-serve invite flow this page
 * needs to also serve — SysDeX's admin-triggered reset is the only path
 * that lands here, see lib/actions/platform-password-reset.ts's header
 * comment).
 */
export default function PlatformResetPasswordPage() {
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
              <h1 className="cds--type-heading-04">Choose a new password</h1>
              <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                Enter a new password for your AORMS Platform account.
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
              {pending ? "Saving…" : "Save new password"}
            </Button>
          </Stack>
        </Form>
      </Column>
    </Grid>
  );
}
