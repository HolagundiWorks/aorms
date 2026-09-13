/**
 * Role-rank table — extracted from `app/(app)/dashboard/page.tsx`'s
 * `FinancialSummary` (2026-09-10 dashboard redesign) once
 * `lib/actions/daily-brief.ts` needed the exact same "does this role see
 * money figures" gate. Values unchanged from the original inline table.
 */
export const ROLE_RANK: Record<string, number> = {
  OWNER: 100,
  PARTNER: 80,
  ACCOUNTANT: 80,
  HR_MANAGER: 80,
  SENIOR: 60,
  ASSOCIATE: 40,
  VIEWER: 20,
};

export function hasRank(role: string | null | undefined, threshold: number): boolean {
  return (ROLE_RANK[role ?? ""] ?? 0) >= threshold;
}

/**
 * Human-readable role labels (2026-09-14, shell/identity/KPI spec §5:
 * the header shows a role like "Administrator", not the raw enum value)
 * — covers every `public.app_role` value (migration 0001), including
 * the three portal roles (CLIENT/CONSULTANT/CONTRACTOR) even though the
 * staff header this is built for never renders those; kept exhaustive so
 * this stays a single source of truth if a portal header ever wants it
 * too, rather than a second, staff-only partial table.
 */
export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Administrator",
  PARTNER: "Partner",
  ACCOUNTANT: "Accountant",
  HR_MANAGER: "HR Manager",
  SENIOR: "Senior Architect",
  ASSOCIATE: "Associate",
  VIEWER: "Viewer",
  SITE_SUPERVISOR: "Site Supervisor",
  CONSULTANT: "Consultant",
  CLIENT: "Client",
  CONTRACTOR: "Contractor",
};
