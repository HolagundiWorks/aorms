import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — bypasses RLS entirely. Server-only, never import
 * from a Client Component. Used for routes with no Supabase Auth session
 * to key RLS off of at all — a share-token read (GET
 * /api/feasibility/[token], token-based authorization instead of RLS) or
 * a bearer-secret-gated cron target (app/api/pulse/recompute/route.ts,
 * app/api/pulse/snapshot-kpis/route.ts) called by pg_cron/pg_net, not a
 * signed-in browser request. Each of those routes does its own
 * authorization check before touching data — this client itself enforces
 * nothing.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
