"use client";

import NextLink from "next/link";
import { Button, Stack } from "@carbon/react";
import { ArrowRight } from "@carbon/icons-react";

/**
 * Must be a Client Component: identity/page.tsx (a Server Component) can't
 * pass Button's `as`/`renderIcon` component-reference props across the RSC
 * boundary — same constraint app/(app)/not-found.tsx already documents.
 */
export function PlatformAuthCta() {
  return (
    <Stack gap={3} orientation="horizontal">
      <Button as={NextLink} href="/platform-signup" renderIcon={ArrowRight} size="sm">
        Create an AORMS Identity
      </Button>
      <Button as={NextLink} href="/platform-login" kind="tertiary" size="sm">
        Sign in
      </Button>
    </Stack>
  );
}
