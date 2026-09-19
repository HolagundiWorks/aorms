/**
 * Supabase client authenticated from an `Authorization: Bearer <access_token>`
 * header instead of the cookie-based session `server.ts` reads. Every other
 * Route Handler in this codebase is either cookie-session (web app),
 * bearer-secret-gated (cron targets), or share-token (feasibility/calendar)
 * — see lib/supabase/service.ts's own doc comment. This is the first
 * genuinely mobile-client shape: the Android app has no cookie jar, only
 * the access token it got from Supabase Auth's own `/auth/v1/token`
 * endpoint, so it sends that token itself on each request. Passing it
 * through as the `Authorization` header (anon key stays the apikey) means
 * PostgREST evaluates RLS as that user, exactly like the cookie-session
 * client does — this is not a privilege escalation path, just a different
 * transport for the same JWT.
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createBearerClient(accessToken: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    },
  );
}

/** Pulls the bearer token out of a Route Handler's request, or null. */
export function bearerTokenFrom(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}
