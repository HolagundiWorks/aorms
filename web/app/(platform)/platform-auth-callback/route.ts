/**
 * AORMS Platform's own PKCE callback — the platform-side counterpart to
 * `app/auth/callback/route.ts`, which only ever exchanges a code against
 * the Office Hub's (`aorms-web`) Supabase project. The Platform
 * (`aorms-platform`) is a genuinely separate Auth project with its own
 * session cookie (`sb-platform-auth-token`, see lib/platform/server.ts),
 * so it needs its own callback — there was none at all before this
 * (2026-09-14, found missing while investigating "activation link and
 * reset password links not working"; see lib/actions/
 * platform-password-reset.ts's own header comment for the full account).
 *
 * Same fixed-SITE_URL discipline as the Office Hub callback's own fix
 * earlier this day — never derive the redirect origin from
 * `request.url` (reflects Hostinger's internal port, not the public
 * address; that exact bug is what broke every email link in the first
 * place). `SHARED_PREFIXES` in lib/platform/subdomains.ts already lists
 * this path so it resolves identically regardless of which portal
 * subdomain the click happens to land on.
 *
 * **Office Hub bridge (2026-09-20)** — this callback serves two genuinely
 * different flows through the same `code` exchange, and they need
 * different handling after it: a password-reset completion
 * (`lib/actions/admin-accounts.ts`'s `adminTriggerPasswordReset` sets
 * `next=/platform-reset-password` explicitly) must land on the set-new-
 * password form untouched, exactly as before — bridging mid-reset would
 * be premature (no new password set yet) and pointless (the recovery
 * flow doesn't need an Office Hub session at all). "Continue with
 * Google" (`platformSignIn` — no `next` param, defaults to `/identity`)
 * is the other, and was the actual gap: it only ever established a
 * Platform session, never the Office Hub bridge `platformSignIn()`'s own
 * password path already gets via `bridgeIdentityToOfficeHub()`. Fixed by
 * running that same best-effort bridge + destination resolution here,
 * gated on `next` not being the reset path — everything about the bridge
 * itself (PENDING-role downgrade for a new Office Hub profile, no
 * privilege escalation, non-fatal on failure) is unchanged, reused as-is
 * from `lib/actions/auth.ts`/`lib/actions/platform.ts`'s own
 * `platformSignIn()`, not reimplemented.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../lib/platform/server";
import { createClient as createWebClient } from "../../../lib/supabase/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { bridgeIdentityToOfficeHub, resolveSignInDestination } from "../../../lib/actions/auth";
import { roleHome } from "../../../lib/auth/role-home";
import { safeNextPath } from "../../../lib/security/safe-next-path";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";
const RESET_PASSWORD_PATH = "/platform-reset-password";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // 2026-09-14 — same open-redirect guard as the Office Hub callback.
  const next = safeNextPath(searchParams.get("next"), "/identity");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (next === RESET_PASSWORD_PATH || !data.user.email) {
        return NextResponse.redirect(`${SITE_URL}${next}`);
      }

      // Best-effort bridge into Office Hub, mirroring platformSignIn()'s
      // password path — a Company Account or platform-staff-only login
      // has no `accounts` row at all, in which case this is a no-op and
      // the caller lands on `next` (Identity's own home) exactly as
      // before this change.
      const platformService = createPlatformServiceRoleClient();
      const { data: account } = await platformService
        .from("accounts")
        .select("id, public_id, full_name")
        .eq("id", data.user.id)
        .maybeSingle();

      if (account) {
        const bridged = await bridgeIdentityToOfficeHub(data.user.email, account);
        if (!("error" in bridged)) {
          const webSupabase = await createWebClient();
          const destination = await resolveSignInDestination(webSupabase, bridged.webUserId, account.public_id);
          if (destination) return NextResponse.redirect(`${SITE_URL}${destination}`);
          const { data: profile } = await webSupabase.from("profiles").select("role").eq("id", bridged.webUserId).maybeSingle();
          const home = roleHome(profile?.role);
          if (home) return NextResponse.redirect(`${SITE_URL}${home}`);
        }
      }

      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  }

  return NextResponse.redirect(
    `${SITE_URL}/platform-login?error=${encodeURIComponent("That link has expired or was already used. Ask an admin to send a new one.")}`,
  );
}
