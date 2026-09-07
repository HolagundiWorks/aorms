import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * AORMS Platform service-role client — bypasses the platform project's RLS
 * entirely. Server-only, never import from a Client Component. Used by
 * web/lib/actions/platform.ts for cross-project operations that can't run
 * as the platform's own signed-in user: looking up an AORMS-U- handle to
 * link it (web/'s own user isn't necessarily signed into the platform
 * project in that browser tab) and recording usage heartbeats (fired from
 * every authenticated app page, not just the (platform) route group).
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL!,
    process.env.PLATFORM_SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
