"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";

export type RepoSourceActionState = { error: string } | null;

const CATEGORIES = ["GENERAL", "DESIGN", "STRUCTURE", "MEP", "COMPLIANCE", "MANAGEMENT", "OTHER"];

export async function createRepoSource(
  _prev: RepoSourceActionState,
  formData: FormData,
): Promise<RepoSourceActionState> {
  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || "GENERAL";
  const rawText = String(formData.get("rawText") ?? "").trim();

  if (!title) return { error: "Title is required." };
  if (rawText.length < 200) return { error: "Source text must be at least 200 characters." };
  if (!CATEGORIES.includes(category)) return { error: "Invalid category." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Matches the router's normalizePlainToMarkdown() being a no-op passthrough
  // for text that's already reasonably formatted — the actual markdown
  // conversion logic isn't ported, this stores raw_text as markdown_text too.
  const { data: inserted, error } = await supabase
    .from("repo_sources")
    .insert({
      title,
      author,
      category,
      raw_text: rawText,
      markdown_text: rawText,
      convert_status: "READY",
      status: "DRAFT",
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "repo_source",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { title, category },
  });

  revalidatePath("/knowledge-bank");
  return null;
}

export type PublishActionState = { error?: string };

/**
 * publish/unpublish only — matches the router's own guard (publish requires
 * REVIEW or PUBLISHED). processWithEoms (the AI rephrase step that would
 * move DRAFT -> REVIEW) isn't ported, same open AI-gateway question as
 * elsewhere, so a source created here can't reach REVIEW through this UI
 * yet — publish will correctly fail with the same message the backend
 * gives until that step exists.
 */
export async function publishRepoSource(sourceId: string): Promise<PublishActionState> {
  const supabase = await createClient();

  const { data: src, error: fetchError } = await supabase
    .from("repo_sources")
    .select("status")
    .eq("id", sourceId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!src || (src.status !== "REVIEW" && src.status !== "PUBLISHED")) {
    return { error: "Run EOMS processing and review sections before publishing." };
  }

  const { error } = await supabase
    .from("repo_sources")
    .update({ status: "PUBLISHED", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "repo_source",
    p_entity_id: sourceId,
    p_action: "PUBLISH",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/knowledge-bank/${sourceId}`);
  revalidatePath("/knowledge-bank");
  return {};
}

export async function unpublishRepoSource(sourceId: string): Promise<PublishActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("repo_sources")
    .update({ status: "REVIEW", published_at: null, updated_at: new Date().toISOString() })
    .eq("id", sourceId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "repo_source",
    p_entity_id: sourceId,
    p_action: "UNPUBLISH",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/knowledge-bank/${sourceId}`);
  revalidatePath("/knowledge-bank");
  return {};
}
