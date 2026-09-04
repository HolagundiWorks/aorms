"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

type ActionState = { error: string } | null;

export async function createTeam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase.from("teams").insert({ name, description }).select("id").single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "team",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { name },
  });

  revalidatePath("/teams");
  return null;
}

export async function addTeamMembership(
  teamId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamMemberId = String(formData.get("teamMemberId") ?? "").trim();
  if (!teamMemberId) return { error: "Select a team member." };

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("team_memberships")
    .insert({ team_id: teamId, team_member_id: teamMemberId })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "team_membership",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { teamId, teamMemberId },
  });

  revalidatePath(`/teams/${teamId}`);
  return null;
}
