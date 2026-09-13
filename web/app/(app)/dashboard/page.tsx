import { redirect } from "next/navigation";

/**
 * /dashboard merged into /pulse (2026-09-14 remediation, per the
 * attached IA brief §4: "Pulse is the AORMS dashboard. There must not be
 * a separate generic Dashboard nav item if Pulse already serves that
 * purpose"). Kept as a redirect, not deleted, per the brief's own §32
 * routing rule — old links/bookmarks to /dashboard still work. See
 * app/(app)/pulse/page.tsx's own header comment for what the merge
 * actually did.
 */
export default function DashboardRedirect() {
  redirect("/pulse");
}
