"use client";

import NextLink from "next/link";
import { Button, Column, Grid } from "@carbon/react";
import { ArrowLeft } from "@carbon/icons-react";
import { PageHeader } from "./PageHeader";

/**
 * Shared route-level 404 body (Next.js `not-found.tsx` convention) — reused
 * across every route group that has its own layout shell (the Client/
 * Collaborator/Contractor Portals, the AORMS Platform), the same way
 * `(app)/not-found.tsx` already covers the office hub. Renders *inside*
 * that group's own layout (its own `notFound()` call from a page, or an
 * unmatched URL under that segment, both keep the enclosing layout/header
 * mounted — only this file's own export substitutes for the page content),
 * so it deliberately has no header of its own to duplicate.
 *
 * Must be a Client Component: a Server Component can't pass a component
 * reference (`Button`'s `renderIcon`) across the RSC boundary — only plain
 * serializable props — so `renderIcon={ArrowLeft}` needs this file on the
 * client side of that boundary. Each route group's own `not-found.tsx` is a
 * thin Server Component wrapper passing only strings, which is fine — the
 * client boundary is established here, not at the re-exporting file.
 */
export function RouteNotFound({
  title = "Not found",
  description = "This page doesn't exist, or you don't have access to it.",
  homeHref,
  homeLabel,
}: {
  title?: string;
  description?: string;
  homeHref: string;
  homeLabel: string;
}) {
  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader title={title} description={description} />
        <Button as={NextLink} href={homeHref} renderIcon={ArrowLeft} kind="tertiary">
          {homeLabel}
        </Button>
      </Column>
    </Grid>
  );
}
