/**
 * Refreshes the Supabase auth session on every request that hits `middleware.ts`.
 * Required by @supabase/ssr — Server Components can't write cookies, so the
 * session refresh has to happen here.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Touching getClaims() is what actually triggers a token refresh when the
  // access token is expired — don't remove this even though the result is
  // unused right now.
  await supabase.auth.getClaims();

  return response;
}
