import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolves the caller's currently ACTIVE firm id (`profiles.firm_id`)
 * directly, rather than an unscoped `.from("firms").select(...).maybeSingle()`
 * that hopes RLS narrows the result to exactly one row.
 *
 * That hope broke with migration 0055's "firms: member read own
 * memberships" policy: it's an *additive* SELECT policy (RLS ORs multiple
 * permissive policies together), so a profile with 2+ firm memberships
 * (see root CLAUDE.md § Multi-tenancy — `switch_active_firm()`/
 * `profile_firm_memberships`) sees EVERY firm row it has ever belonged to
 * on a plain `.from("firms").select(...)`, not just the currently active
 * one. An unscoped `.single()`/`.maybeSingle()` call then either throws
 * "JSON object requested, multiple (or no) rows returned" (the exact error
 * QA hit creating an invoice), or — if truncated with `.limit(1)` first —
 * silently returns whichever row Postgres happens to return first, which
 * is not guaranteed to be the active firm (the exact bug QA hit on
 * `/firm-settings` after `switch_active_firm()`).
 *
 * Reading `profiles.firm_id` first sidesteps the ambiguity: "profiles:
 * read own" (`id = auth.uid()`) always scopes a caller to exactly their
 * own row, and `profiles.firm_id` IS the definition of "currently active
 * firm" (root CLAUDE.md: "profiles.firm_id is the caller's *currently
 * active* firm"). Every `firms` read/update should filter by the id this
 * returns — `.eq("id", firmId)` — instead of leaving `firms` unscoped.
 */
export async function getActiveFirmId(
  supabase: SupabaseClient,
  userId: string | undefined | null,
): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("firm_id").eq("id", userId).maybeSingle();
  return data?.firm_id ?? null;
}
