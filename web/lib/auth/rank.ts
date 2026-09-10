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
