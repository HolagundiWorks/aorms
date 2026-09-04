"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type TeamMemberActionState = { error: string } | null;

/**
 * Owner-only write per the router (ownerProcedure) — RLS enforces this
 * server-side regardless of what the UI shows, but the page also hides
 * the form from non-owners for a clean experience (see team-members page).
 */
export async function createTeamMember(
  _prev: TeamMemberActionState,
  formData: FormData,
): Promise<TeamMemberActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const employmentType = String(formData.get("employmentType") ?? "").trim() || "FULL_TIME";
  const email = String(formData.get("email") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const monthlySalaryRupees = String(formData.get("monthlySalary") ?? "").trim();
  const dateJoined = String(formData.get("dateJoined") ?? "").trim() || null;
  const jobTitle = String(formData.get("jobTitle") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (!role) return { error: "Role is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("team_members")
    .insert({
      name,
      role,
      employment_type: employmentType,
      email,
      phone,
      monthly_salary_paise: monthlySalaryRupees ? Math.round(Number(monthlySalaryRupees) * 100) : 0,
      date_joined: dateJoined,
      job_title: jobTitle,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "team_member",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name, role },
  });

  revalidatePath("/team-members");
  return null;
}
