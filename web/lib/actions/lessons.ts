"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type LessonActionState = { error: string } | null;

export async function createLesson(
  _prev: LessonActionState,
  formData: FormData,
): Promise<LessonActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "OTHER";
  const body = String(formData.get("body") ?? "").trim();
  const recommendations = String(formData.get("recommendations") ?? "").trim();

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };
  if (!body) return { error: "Body is required." };

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: inserted, error } = await supabase
    .from("lessons_learned")
    .insert({
      project_id: projectId,
      title,
      category,
      body,
      recommendations,
      author_id: user?.id ?? null,
      author_name: profile?.full_name ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "lessons_learned",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { projectId, title, category },
  });

  revalidatePath("/lessons");
  return null;
}
