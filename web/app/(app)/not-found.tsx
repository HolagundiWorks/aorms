"use client";

import NextLink from "next/link";
import { Button, Column, Grid } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
import { PageHeader } from "../../components/aorms/PageHeader";

/**
 * Route-level 404 (Next.js not-found.tsx convention) for every page under
 * the authenticated app shell — reached by Next's own routing (an unknown
 * URL) or by a Server Component page's own `notFound()` call (e.g. a
 * detail page whose :id doesn't exist, per every `if (!record) notFound();`
 * guard across this codebase's detail pages). Renders within AppShell
 * (the layout wraps this same route segment), so the sidebar stays intact
 * instead of dropping to a bare unstyled 404.
 *
 * Must be a Client Component: a Server Component can't pass a component
 * reference (Button's `renderIcon`) across the RSC boundary — only plain
 * serializable props — so `renderIcon={ArrowLeft}` needs this file on the
 * client side of that boundary, same reason error.tsx already is one.
 */
export default function AppNotFound() {
  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title="Not found" description="This record or page doesn't exist, or you don't have access to it." />
        <Button as={NextLink} href="/dashboard" renderIcon={ArrowLeft} kind="tertiary">
          Back to dashboard
        </Button>
      </Column>
    </Grid>
  );
}
