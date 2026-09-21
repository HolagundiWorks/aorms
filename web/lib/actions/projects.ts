"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { toSafeErrorMessage } from "../security/safe-error";
import { checkPlanCap } from "../platform/firm-studio";

export type ProjectActionState = { error: string } | null;

/**
 * Roles with `has_capability('write')` (rank >= 40, or an explicit
 * allow-list role — see web/supabase/migrations/0002_capability_helper.sql)
 * — same set web/lib/actions/clients.ts's WRITE_TIER_ROLES uses. Mirrored
 * here as an explicit, friendly-error check in the Server Action (defense
 * in depth): the real authorization boundary is RLS
 * ("project_offices: staff create"/"project_offices: staff update", fixed
 * in migration 0084_project_offices_write_requires_capability.sql to check
 * has_capability('write') instead of the too-broad is_office_staff(),
 * which incorrectly included VIEWER — found by live QA 2026-09-21, the
 * same class of bug 0082/0083 fixed for clients/contractors). Without
 * this app-level check, a VIEWER's submit would fail on the INSERT with a
 * raw RLS-denial error instead of a clear message.
 */
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export async function createProjectRecord(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim();
  const workType = String(formData.get("workType") ?? "ARCHITECTURE");
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  // Project-specific communication contact (migration 0044) — deliberately
  // independent of the selected client's own email/phone: the project
  // still reads the client's name/other info via clientId as before, but
  // day-to-day project communication often goes to a different address
  // (site coordination, a specific point of contact for this job) than
  // the client record's own default.
  const contactEmail = String(formData.get("contactEmail") ?? "").trim() || null;
  const contactPhone = String(formData.get("contactPhone") ?? "").trim() || null;

  if (!title) return { error: "Title is required." };
  if (!projectType) return { error: "Project type is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Server-side role check (2026-09-21 — VIEWER-can-create-projects bug
  // found by live QA, mirroring the 2026-09-20 clients bug fixed in
  // migration 0082): the actual authorization boundary is RLS
  // ("project_offices: staff create", fixed in migration
  // 0084_project_offices_write_requires_capability.sql to check
  // has_capability('write') instead of the too-broad is_office_staff(),
  // which incorrectly included VIEWER). This app-level check is defense
  // in depth, and turns what would otherwise be a raw RLS-denial error
  // into a clear message.
  const { data: authProfile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  if (!authProfile || !WRITE_TIER_ROLES.has(authProfile.role)) {
    return { error: "You don't have permission to create projects — contact a firm owner or partner." };
  }

  // Was a random placeholder (draftRef()) before Phase 10 — next_ref() existed
  // since migration 0003 but this action predated it and was never switched
  // over. Fixed here rather than knowingly introducing the same inconsistency
  // for Phase 10's lead-conversion path, which creates project_offices rows too.
  // Plan cap (2026-09-14, real pricing restructure) — Free-tier studios
  // are capped at 2 active projects (see lib/platform/firm-studio.ts's
  // PLAN_CAPS); "active" excludes ARCHIVED/COMPLETED so a wrapped-up
  // project doesn't permanently occupy one of a free studio's 2 slots.
  // No cap at all on Studio/Professional/Enterprise, or when this
  // deployment isn't linked to a Platform studio.
  const { count: activeProjectCount } = await supabase
    .from("project_offices")
    .select("id", { count: "exact", head: true })
    .not("status", "in", "(ARCHIVED,COMPLETED)");
  const capError = await checkPlanCap(activeProjectCount ?? 0, "project");
  if (capError) return capError;

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "projectoffice",
    p_default_prefix: "PRJ",
  });
  if (refError) return { error: `Could not mint a reference: ${toSafeErrorMessage(refError)}` };

  const { data: inserted, error } = await supabase
    .from("project_offices")
    .insert({
      ref: refData,
      title,
      project_type: projectType,
      work_type: workType,
      client_id: clientId,
      city,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: toSafeErrorMessage(error) };

  await supabase.rpc("write_audit", {
    p_entity: "project_office",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { title, projectType, workType, clientId, city, contactEmail, contactPhone },
  });

  revalidatePath("/projects");
  return null;
}
