import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Server-only, never import
 * from a Client Component. Used ONLY for the one legitimately-anonymous
 * read path in this app: GET /api/feasibility/[token] (see that route),
 * which does its own token-based authorization instead of relying on RLS
 * (a share token isn't a Supabase Auth session, so RLS has nothing to key
 * off of for an anonymous visitor).
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
