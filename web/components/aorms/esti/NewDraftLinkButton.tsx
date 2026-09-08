"use client";

import NextLink from "next/link";
import { Button } from "@carbon/react";

/**
 * A plain `<Button as={NextLink}>` from a Server Component page crashes RSC
 * serialization for Carbon's Button (the same "Functions cannot be passed
 * directly to Client Components" bug not-found.tsx/LandingButtons.tsx hit
 * with renderIcon/as) — isolated into its own small Client Component
 * instead of marking the whole /ai-runs page "use client".
 */
export function NewDraftLinkButton() {
  return (
    <Button as={NextLink} href="/ai-runs/new" size="sm">
      New draft
    </Button>
  );
}
