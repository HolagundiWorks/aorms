/**
 * Where a signed-in profile lands, by role. Staff roles (the same set
 * `is_office_staff()` covers on the DB side) go to the office hub; CLIENT,
 * CONSULTANT, and CONTRACTOR go to their respective portals. SITE_SUPERVISOR
 * doesn't have a portal built yet — routing it anywhere real would be
 * either a dead end (staff dashboard, RLS-blocked to near-empty) or a false
 * promise, so `roleHome()` returns `null` for it and callers sign the user
 * back out with an explicit "not available yet" message instead.
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
  if (role === "CONSULTANT") return "/collab-portal";
  if (role === "CONTRACTOR") return "/contractor-portal";
  return null;
}
