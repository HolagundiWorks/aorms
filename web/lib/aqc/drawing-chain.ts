import type { SupabaseClient } from "@supabase/supabase-js";

/** A drawing's revision chain is keyed by its root: the first revision's own id (`root_id` is null there). RLS-scoped. */
export async function chainRoot(supabase: SupabaseClient, drawingId: string): Promise<{ rootId: string; projectId: string } | null> {
  const { data } = await supabase.from("drawings").select("id, root_id, project_id").eq("id", drawingId).maybeSingle();
  return data ? { rootId: data.root_id ?? data.id, projectId: data.project_id } : null;
}
