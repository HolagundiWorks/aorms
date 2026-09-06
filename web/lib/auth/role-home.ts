/**
 * Where a signed-in profile lands, by role. Staff roles (the same set
 * `is_office_staff()` covers on the DB side) go to the office hub; CLIENT
 * goes to the new client portal. CONSULTANT/CONTRACTOR/SITE_SUPERVISOR
 * don't have a portal built yet (Collaborator/Contractor/Site portals are
 * flagged follow-ups after this one) — routing them anywhere real would be
 * either a dead end (staff dashboard, RLS-blocked to near-empty) or a false
 * promise, so `roleHome()` returns `null` for them and callers sign the
 * user back out with an explicit "not available yet" message instead.
 */

const STAFF_ROLES = new Set([
  "OWNER",
  "PARTNER",
  "ACCOUNTANT",
  "HR_MANAGER",
  "SENIOR",
  "ASSOCIATE",
  "VIEWER",
]);

export function roleHome(role: string | null | undefined): string | null {
  if (role && STAFF_ROLES.has(role)) return "/dashboard";
  if (role === "CLIENT") return "/portal";
  return null;
}
