"use server";

/**
 * AORMS Platform — sign-up / sign-in / sign-out and identity linking (split from platform.ts, 2026-10-06).
 * Original design notes: see the history of lib/actions/platform.ts and docs/esti/AORMS-IDENTITY.md.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient as createWebClient } from "../supabase/server";
import { createServiceRoleClient as createWebServiceRoleClient } from "../supabase/service";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { resolvePortalHomeFromHost } from "../platform/subdomains";
import { checkRateLimitShared, rateLimitIdentifier } from "../security/rate-limit";
import { validatePassword } from "../security/password-policy";
import { toSafeErrorMessage } from "../security/safe-error";
import { bridgeIdentityToOfficeHub, bridgeOfficeHubToIdentity, resolveSignInDestination, signOutSafely } from "../auth/bridge";
import { roleHome } from "../auth/role-home";
import { stampSessionStart, clearSessionStart } from "../supabase/session-cap";
import type { PlatformActionState } from "./platform-types";

/** Where sign-up/sign-in/sign-out should land — the current portal
 * subdomain's own home (see lib/platform/subdomains.ts), so a
 * ConnectDeX-side sign-in doesn't bounce someone over to Identity. */
async function currentPortalHome(): Promise<string> {
  return resolvePortalHomeFromHost((await headers()).get("host"));
}

// ── Platform auth (separate login from the firm app's own) ────────────────

export async function platformSignUp(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!fullName) return { error: "Full name is required." };
  if (!email || !password) return { error: "Email and password are required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) return { error: passwordCheck.error };

  const rateLimit = await checkRateLimitShared("platformSignUp", await rateLimitIdentifier(), { max: 5, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.ok) return { error: `Too many sign-up attempts — try again in ${rateLimit.retryAfterSeconds}s.` };

  const supabase = await createPlatformClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, captchaToken },
  });
  if (error) return { error: toSafeErrorMessage(error) };

  redirect(await currentPortalHome());
}

/**
 * The one unified login — identity.aorms.in/platform-login, reachable
 * identically on every portal subdomain and the main domain (see
 * lib/platform/subdomains.ts's SHARED_PREFIXES). `aorms.in/login`
 * redirects here now (app/(auth)/login/page.tsx) rather than running its
 * own separate page. Tries the Platform password first (the common
 * case), then falls back to an Office-Hub-only password (the
 * `bridgeOfficeHubToIdentity()` reverse bridge above) — symmetric to how
 * the old `aorms.in/login` already fell back from Office Hub to Platform
 * (auth.ts's `bridgeIdentityToOfficeHub()`). Whichever password matches,
 * the OTHER system's session is established too when there's a plausible
 * reason to (an existing or newly-bridged account), so one sign-in here
 * carries across both systems — that's the actual fix for "confusion
 * between two login pages," not just picking one URL to keep.
 *
 * One rate-limit check covers the whole attempt (not one per system) —
 * an attacker gets exactly 8 tries per 15 minutes against a given email
 * here, the same budget `platformSignIn` always had, not double it by
 * probing each backend separately.
 */
export async function platformSignIn(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "");

  // Rate-limited per IP+email so one mistyped password from a real user
  // never blocks them from trying a different account from the same
  // network — only repeated attempts against the same identifier count.
  const rateLimit = await checkRateLimitShared("platformSignIn", `${await rateLimitIdentifier()}:${email.toLowerCase()}`, {
    max: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.ok) return { error: `Too many attempts — try again in ${rateLimit.retryAfterSeconds}s.` };

  const supabase = await createPlatformClient();
  const { data: platformAuth, error: platformError } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });

  let webUserId: string | null = null;
  let platformPublicId: string | null = null;

  if (!platformError && platformAuth.user) {
    // Platform password matched — the common, primary path.
    const platformService = createPlatformServiceRoleClient();
    const { data: account } = await platformService
      .from("accounts")
      .select("id, public_id, full_name")
      .eq("id", platformAuth.user.id)
      .maybeSingle();

    if (account) {
      platformPublicId = account.public_id;
      // Best-effort bridge into Office Hub too, so navigating there later
      // doesn't need a second sign-in. Not fatal to this sign-in if it
      // fails: Platform access is real either way, Office Hub is a bonus,
      // not a requirement.
      const bridged = await bridgeIdentityToOfficeHub(email, account);
      if (!("error" in bridged)) webUserId = bridged.webUserId;
    }
    // else: a real Platform session (Company Account or platform-staff-
    // only), but not a Studio/Identity account — no Office Hub bridge
    // attempted, same "deliberately separate" reasoning
    // bridgeIdentityToOfficeHub's own other caller already documents.
    // Falls through to destination resolution below with webUserId still
    // null, landing on this portal's own home.
  } else {
    // Platform password didn't match. Try it as an Office-Hub-only
    // password instead, so an existing Office Hub account that never
    // created a personal AORMS Identity still works on this one unified
    // login page.
    const webSupabase = await createWebClient();
    const { data: webAuth, error: webError } = await webSupabase.auth.signInWithPassword({ email, password });
    if (webError || !webAuth.user) {
      // Same message either system would give for a wrong password —
      // doesn't reveal which one, if either, recognizes this email.
      return { error: "Invalid login credentials" };
    }

    webUserId = webAuth.user.id;
    const bridged = await bridgeOfficeHubToIdentity(email, webUserId);
    if ("error" in bridged) return bridged;
    platformPublicId = bridged.platformPublicId;
  }

  // Destination resolution — prefers a specific Office Hub firm when
  // there's exactly one unambiguous one (the more useful destination for
  // day-to-day work), the studio picker when there's real ambiguity, and
  // falls back to the current portal's own home otherwise. Deliberately
  // does NOT sign the caller out and error just because Office Hub has no
  // firm for them, unlike auth.ts's signInWithIdentity() (kept for
  // backward compat, see its own header) — that page's whole purpose was
  // reaching Office Hub specifically, so "no firm" was a real dead end
  // there. Here, Platform access with zero Office Hub relevance is a
  // completely normal, valid outcome, not an error.
  // Purge the client Router Cache before landing anywhere post-sign-in —
  // every exit path below redirects, so one call here covers all of them.
  // See auth.ts's signIn() for the full mechanism (2026-09-21 QA's "first
  // load after sign-in shows stale data, reload is correct" pattern) — a
  // Next.js static-shell prefetch left over from before this sign-in can
  // otherwise serve stale, pre-auth content on the first post-sign-in nav
  // click. Must run before any redirect() below, since redirect() throws.
  revalidatePath("/", "layout");

  if (webUserId) {
    const webSupabase = await createWebClient();
    const { data: profile } = await webSupabase.from("profiles").select("role").eq("id", webUserId).maybeSingle();
    const destination = await resolveSignInDestination(webSupabase, webUserId, platformPublicId);
    if (destination) {
      await stampSessionStart();
      redirect(destination);
    }
    const home = roleHome(profile?.role);
    if (home) {
      await stampSessionStart();
      redirect(home);
    }
  }

  redirect(await currentPortalHome());
}

/**
 * Google sign-in (docs/esti/AORMS-V2-DEVELOPER-GUIDELINES.md § 5) —
 * against aorms-platform's own Supabase Auth, not aorms-web's: the spec's
 * flow lands in "AORMS User" then "Create / Join Practice," which is the
 * Platform's job (Studio membership), not a single Office Hub deployment's.
 * Reuses the existing PKCE callback (app/(platform)/platform-auth-
 * callback/route.ts) unchanged — it already does a generic `code` exchange
 * for any Supabase Auth flow (built for magic links/password reset, but
 * `exchangeCodeForSession` is the exact same mechanism OAuth uses).
 *
 * Requires the Google provider enabled on aorms-platform's Auth config
 * (external_google_enabled/client_id/secret via the Management API) and
 * `https://qbgbnhthchhbammzeebg.supabase.co/auth/v1/callback` registered
 * as an authorized redirect URI on the Google Cloud OAuth client — both
 * one-time setup steps, not something this code does at runtime.
 */
export async function signInWithGoogle(): Promise<never> {
  const supabase = await createPlatformClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aorms.in";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/platform-auth-callback` },
  });

  if (error || !data.url) {
    redirect(`/platform-login?error=${encodeURIComponent("Google sign-in isn't available right now.")}`);
  }

  redirect(data.url);
}

export async function platformSignOut(): Promise<void> {
  const supabase = await createPlatformClient();
  const webSupabase = await createWebClient();

  // B1 fix (2026-09-20 QA) — the unified login (platformSignIn() above,
  // and auth.ts's bridgeIdentityToOfficeHub()) can establish an Office Hub
  // (aorms-web) session alongside this Platform one from a single sign-in.
  // Clearing only the Platform cookie here left that second session fully
  // valid: identity/page.tsx's own "Office-Hub-link" fallback (see its
  // header comment) would then read that still-live web session, resolve
  // profiles.platform_public_id, and keep rendering the fully authenticated
  // /identity page — sign-out looked successful (redirected to the signed-
  // out home) but the real session never cleared. Mirrored in auth.ts's
  // signOut() for the reverse direction.
  //
  // 2026-09-21 QA re-test: that fix still failed intermittently (~1-in-4),
  // reproducing the ORIGINAL bug exactly. Root cause was this function's
  // two bare `await ...auth.signOut()` calls, not the mirroring itself —
  // see signOutSafely()'s own header comment (auth.ts) for the precise
  // mechanism: a transient network failure calling ONE project's Auth
  // server throws (not returns {error}) out of the SDK, which used to
  // abort this whole action before the OTHER project's signOut() call
  // ever ran and before redirect(). Both are now independent.
  await signOutSafely(() => supabase.auth.signOut(), "Platform");
  await signOutSafely(() => webSupabase.auth.signOut(), "Office Hub");
  await clearSessionStart();

  // Purge the client Router Cache so a page reached right after this
  // redirect (or a subsequent navigation in this tab) can't serve a
  // pre-sign-out RSC payload for a route previously prefetched while
  // still signed in. Must run before redirect().
  revalidatePath("/", "layout");
  redirect(await currentPortalHome());
}

// ── Linking a firm login to a portable AORMS-U- identity ───────────────────

/**
 * Verifies `handle` exists on the platform project (service-role lookup —
 * the web/ user isn't necessarily signed into the platform in this browser
 * tab), then stores it on the current web/ user's own profile row.
 *
 * Uses web/'s service-role client for the profiles update, not the regular
 * RLS-scoped one: migration 0001's "profiles: owner manages" policy only
 * lets an OWNER update ANY profile row (including their own) — there's no
 * "update own profile" policy for other roles. Linking your own identity
 * should work for every role, not just OWNER, and the row being updated is
 * always the caller's own (resolved from their session, never from client
 * input), so bypassing RLS here carries no privilege-escalation risk —
 * same justification web/lib/supabase/service.ts's existing use documents.
 */
export async function linkPlatformIdentity(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!handle) return { error: "Enter your AORMS-U- handle." };

  const webSupabase = await createWebClient();
  const {
    data: { user },
  } = await webSupabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const platformService = createPlatformServiceRoleClient();
  const { data: account, error: lookupError } = await platformService
    .from("accounts")
    .select("public_id")
    .eq("public_id", handle)
    .maybeSingle();
  if (lookupError) return { error: toSafeErrorMessage(lookupError) };
  if (!account) return { error: `No AORMS Platform account found with handle ${handle}.` };

  const webService = createWebServiceRoleClient();
  const { error: updateError } = await webService
    .from("profiles")
    .update({ platform_public_id: account.public_id })
    .eq("id", user.id);
  if (updateError) return { error: toSafeErrorMessage(updateError) };

  await webSupabase.rpc("write_audit", {
    p_entity: "profile",
    p_entity_id: user.id,
    p_action: "UPDATE",
    p_before: null,
    p_after: { platform_public_id: account.public_id },
  });

  revalidatePath("/identity");
  return null;
}

/**
 * Links the caller's own firm (not their personal identity — see
 * linkPlatformIdentity above for that) to one AORMS Platform Studio
 * (migration 0048's firms.platform_studio_public_id) — the studio whose
 * free/paid plan then gates the client and contractor caps
 * (lib/platform/firm-studio.ts). Multi-tenant as of migration 0053: the
 * update goes through the caller's own RLS-scoped client (not
 * service-role), scoped to `id = current_firm_id()`, so "firm: owner/
 * partner update" is the actual authorization check, not this function
 * deciding who's allowed.
 */
export async function linkFirmToStudio(_prev: PlatformActionState, formData: FormData): Promise<PlatformActionState> {
  const handle = String(formData.get("handle") ?? "").trim().toUpperCase();
  if (!handle) return { error: "Enter the studio's AORMS-S- handle." };

  const platformService = createPlatformServiceRoleClient();
  const { data: studio, error: lookupError } = await platformService.from("studios").select("public_id").eq("public_id", handle).maybeSingle();
  if (lookupError) return { error: toSafeErrorMessage(lookupError) };
  if (!studio) return { error: `No studio found with handle ${handle}.` };

  const webSupabase = await createWebClient();
  const { error: updateError } = await webSupabase
    .from("firms")
    .update({ platform_studio_public_id: studio.public_id });
  if (updateError) return { error: toSafeErrorMessage(updateError) };

  revalidatePath("/firm-settings");
  return null;
}
