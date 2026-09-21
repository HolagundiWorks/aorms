"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { roleHome } from "../auth/role-home";
import { checkRateLimit, rateLimitIdentifier } from "../security/rate-limit";

export type AuthActionState = { error: string } | null;

/**
 * Multi-tenancy (migration 0055) — a single AORMS Identity account can
 * belong to more than one Studio (`platform.studio_memberships`), and one
 * Office Hub profile can in turn hold `profile_firm_memberships` in more
 * than one firm (switchable "active firm" — see 0055's own header). Both
 * signIn() and signInWithIdentity() call this after establishing a real
 * session to decide: straight to the profile's usual home (the common
 * case, zero extra friction), to the studio picker (genuine ambiguity —
 * more than one firm already joined, or more Platform studios available
 * to join/provision than have been claimed yet), or fall through to the
 * existing "no portal yet" sign-out.
 *
 * Returns a redirect path, or null to mean "proceed with roleHome() as
 * before" (unchanged behavior for every account that isn't multi-studio).
 */
export async function resolveSignInDestination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  webUserId: string,
  platformPublicId: string | null | undefined,
): Promise<string | null> {
  const { count: membershipCount } = await supabase
    .from("profile_firm_memberships")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", webUserId);

  if ((membershipCount ?? 0) >= 2) return "/select-studio";
  if ((membershipCount ?? 0) === 1) return null;

  // No firm membership yet. If this profile is linked to a Platform
  // Identity account, check whether there's at least one Studio it could
  // join/provision from — if so, send them to the picker (onboarding)
  // instead of the flat "not available yet" sign-out, so a profile that
  // later gains Studio access via the Platform isn't stuck forever.
  if (!platformPublicId) return null;

  const platformService = createPlatformServiceRoleClient();
  const { data: account } = await platformService.from("accounts").select("id").eq("public_id", platformPublicId).maybeSingle();
  if (!account) return null;

  const { count: studioCount } = await platformService
    .from("studio_memberships")
    .select("id", { count: "exact", head: true })
    .eq("account_id", account.id)
    .eq("status", "ACTIVE");

  return (studioCount ?? 0) >= 1 ? "/select-studio" : null;
}

export async function signIn(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const rateLimit = checkRateLimit("signIn", `${await rateLimitIdentifier()}:${email.toLowerCase()}`, {
    max: 8,
    windowMs: 15 * 60 * 1000,
  });
  if (!rateLimit.ok) return { error: `Too many attempts — try again in ${rateLimit.retryAfterSeconds}s.` };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 2026-09-14 — the password didn't match any aorms-web account. Before
    // giving up, try it as an AORMS Identity (Platform) password instead —
    // see signInWithIdentity()'s own header comment for the full design
    // and why this is safe. Every existing Office Hub account is
    // completely unaffected: this branch only ever runs after the normal
    // aorms-web check above has already failed.
    return await signInWithIdentity(email, password);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, platform_public_id")
    .eq("id", data.user.id)
    .maybeSingle();

  const destination = await resolveSignInDestination(supabase, data.user.id, profile?.platform_public_id);
  // Purge the client Router Cache before landing anywhere post-sign-in —
  // 2026-09-21 QA found a real "first load after sign-in shows stale
  // data, reload is correct" pattern (Licence Management stats, a role
  // label, the Clients Import CSV panel's VIEWER gating) affecting pages
  // reached via a nav <Link> after this redirect, not this redirect's own
  // destination. Next.js prefetches and caches static-shell route
  // segments client-side for up to staleTimes.static (5 min default) —
  // a Link hovered/prefetched before this sign-in (e.g. a stale prefetch
  // left over from a previous session in the same tab) can serve that
  // cached, pre-sign-in RSC payload on the very next click, until a hard
  // reload bypasses the client cache entirely. `revalidatePath('/',
  // 'layout')` is next/cache's own documented fix for exactly this case
  // ("purges the Client Cache, and invalidates all cached data") — must
  // run before any redirect() below, since redirect() throws and nothing
  // after it executes.
  revalidatePath("/", "layout");
  if (destination) redirect(destination);

  const home = roleHome(profile?.role);
  if (!home) {
    // signOutSafely() (defined below, hoisted — a function declaration)
    // so a transient network throw here can't leave this corrective
    // sign-out half-done either. Only one client involved on this branch,
    // but it's the same auth-js throw-vs-{error} gap signOutSafely's own
    // header documents.
    await signOutSafely(() => supabase.auth.signOut(), "Office Hub");
    return { error: "This account's portal isn't available yet — contact your firm for access." };
  }

  redirect(home);
}

/**
 * 2026-09-14 — "why is aorms.in/login not connected to Identity" (explicit
 * user report). Office Hub (`aorms-web`) and the AORMS Platform
 * (`aorms-platform`) are genuinely separate Supabase Auth systems — a
 * person's Identity password was never checked here at all before this.
 * User's own explicit direction, after being shown the concrete
 * consequence and confirming anyway: an AORMS Identity sign-in should be
 * able to reach Office Hub even with **no prior link and no existing
 * Office Hub account** ("auto-provision... for any linked/new Identity
 * account").
 *
 * **The part that makes this safe rather than a walk-up privilege-
 * escalation hole**: `public.profiles.role` defaults to `'ASSOCIATE'` — a
 * real staff role with genuine internal access — the moment a new
 * `auth.users` row is created (`handle_new_user()`'s trigger inserts the
 * profile automatically). A naive "create the user, you're in" flow would
 * silently hand ANY internet stranger with a free Identity account real
 * staff access to this firm's private Office Hub data. Found and fixed
 * *before* writing this function, not after: the profile a brand-new
 * sign-in gets is immediately downgraded to `'PENDING'` (platform
 * migration `web/supabase/migrations/0049_pending_role_for_identity_
 * signin.sql` — a new enum value `roleHome()` already treats as "no
 * portal" the same as any role outside its explicit allowlists, and every
 * RLS policy/`is_office_staff()` in this schema allowlists roles
 * explicitly rather than excluding them, confirmed by reading that
 * function before relying on it). An OWNER/PARTNER must explicitly
 * promote a PENDING profile via `/users` before it can see anything —
 * "auto-provision" means "a real row now exists to promote", never "real
 * access was granted."
 *
 * Session-bootstrap mechanism: Supabase Auth sessions are per-project, so
 * a password verified against `aorms-platform` can't itself authenticate
 * against `aorms-web` — there is no shared credential store to check
 * against. Standard federated-login pattern instead: once the Platform
 * password is verified, `admin.generateLink()` + `auth.verifyOtp()`
 * mints a real aorms-web session server-side, with no password of this
 * project's own ever being set or known by the person signing in.
 * Verified live before wiring this in (isolated script, not assumed):
 * `generateLink({type:'magiclink'})` → `verifyOtp({type:'magiclink'})`
 * on the cookie-writing client genuinely establishes a working session,
 * and `admin.createUser` on an email that already exists fails cleanly
 * with `code: 'email_exists'` rather than silently succeeding twice.
 */
export type OfficeHubBridgeResult = { webUserId: string; isNewUser: boolean } | { error: string };

/**
 * Best-effort, resilient sign-out for ONE Supabase auth client. Used
 * everywhere this codebase needs to clear more than one project's session
 * in a single action (signOut() and signInWithIdentity() below,
 * platform.ts's platformSignOut()) — the real bug this fixes (2026-09-21
 * QA re-test of the 2026-09-20 B1 fix, ~1-in-4 repro): auth-js's
 * `admin.signOut()` catches and returns AuthErrors as `{error}`, but
 * RE-THROWS any other exception instead (GoTrueAdminApi.signOut() —
 * `catch (error) { if (isAuthError(error)) return {data:null,error}; throw
 * error; }`), which is exactly what a genuine transient network failure
 * (DNS blip, connection reset, a cold Supabase Auth REST call timing out)
 * looks like. A bare, unguarded `await client.auth.signOut()` (the
 * previous code here and in platform.ts) let that throw escape the whole
 * Server Action: the exception aborted execution before the OTHER
 * project's `auth.signOut()` call ever ran, before cookies were mutated
 * for either client's storage adapter, and before `redirect()` — leaving
 * both sessions (or the second one, depending on call order) fully live
 * while the action itself failed silently from the caller's point of view.
 * This reproduces the *exact* originally-reported symptom, not a new one:
 * "looks signed out, one project's cookie is still valid." Every call site
 * now attempts BOTH sign-outs unconditionally (one failing can't skip the
 * other), retries once on a genuine throw (a transient blip is worth one
 * immediate retry), and logs rather than silently swallowing a persistent
 * failure — the caller still proceeds to redirect either way, since
 * trapping the user on a broken sign-out page is worse than a logged,
 * best-effort session clear.
 */
export async function signOutSafely(signOut: () => Promise<{ error: { message: string } | null }>, label: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { error } = await signOut();
      if (!error) return;
      if (attempt === 2) {
        console.error(`[signOutSafely] ${label} sign-out returned an error after retry — its session may not be fully cleared:`, error.message);
      }
    } catch (err) {
      if (attempt === 2) {
        console.error(`[signOutSafely] ${label} sign-out threw after retry — its session may not be fully cleared:`, err);
      }
    }
  }
}

/**
 * Establishes (or reuses) an aorms-web session for an ALREADY-verified
 * Platform Identity account — refactored 2026-09-20 out of the body of
 * signInWithIdentity() below, when the single unified login page
 * (identity.aorms.in/platform-login, see lib/actions/platform.ts's
 * platformSignIn()) needed the exact same bridge without re-checking a
 * password it already checked itself. Every safety property from this
 * function's original design is unchanged, just no longer bound to one
 * page's Server Action:
 *
 * `public.profiles.role` defaults to `'ASSOCIATE'` — a real staff role
 * with genuine internal access — the moment a new `auth.users` row is
 * created (`handle_new_user()`'s trigger). A naive "create the user,
 * you're in" flow would silently hand ANY Identity account holder real
 * staff access to a firm's private Office Hub data. The profile a
 * brand-new bridge gets is immediately downgraded to `'PENDING'`
 * (migration `0049_pending_role_for_identity_signin.sql`) — `roleHome()`
 * treats it as "no portal" the same as any role outside its explicit
 * allowlists, and every RLS policy/`is_office_staff()` in this schema
 * allowlists roles explicitly rather than excluding them. An
 * OWNER/PARTNER must explicitly promote a PENDING profile via `/users`
 * before it can see anything — "bridge" means "a real row now exists to
 * promote", never "real access was granted."
 *
 * Session-bootstrap mechanism: Supabase Auth sessions are per-project, so
 * a password verified against `aorms-platform` can't itself authenticate
 * against `aorms-web` — there is no shared credential store to check
 * against. Standard federated-login pattern instead: `admin.
 * generateLink()` + `auth.verifyOtp()` mints a real aorms-web session
 * server-side, with no password of this project's own ever being set or
 * known by the person signing in.
 */
export async function bridgeIdentityToOfficeHub(
  email: string,
  platformAccount: { id: string; public_id: string; full_name: string },
): Promise<OfficeHubBridgeResult> {
  const webService = createServiceRoleClient();
  const { data: createdUser, error: createErr } = await webService.auth.admin.createUser({
    email,
    // Never surfaced to anyone — this account signs in via its Identity
    // password from here on, same as `inviteUserByEmail`'s pattern
    // elsewhere in this codebase never surfacing the placeholder it sets.
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: platformAccount.full_name },
  });

  const isNewUser = !createErr;
  if (createErr && createErr.code !== "email_exists") {
    return { error: "Couldn't sign in — please try again." };
  }

  if (isNewUser) {
    // Downgrade away from handle_new_user()'s default 'ASSOCIATE' role
    // before anything else runs — see this function's own header comment.
    const { error: downgradeErr } = await webService
      .from("profiles")
      .update({ role: "PENDING", platform_public_id: platformAccount.public_id })
      .eq("id", createdUser!.user.id);
    if (downgradeErr) {
      // Never leave a freshly-created profile at its dangerous default —
      // undo the user creation entirely and fail closed.
      await webService.auth.admin.deleteUser(createdUser!.user.id);
      return { error: "Couldn't finish setting up your account — please try again." };
    }
  }

  const { data: linkData, error: linkErr } = await webService.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !linkData.properties.hashed_token) {
    return { error: "Couldn't sign in — please try again." };
  }
  const webUserId = createdUser?.user?.id ?? linkData.user?.id;
  if (!webUserId) {
    return { error: "Couldn't sign in — please try again." };
  }

  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: "magiclink" });
  if (verifyErr) {
    return { error: "Couldn't sign in — please try again." };
  }

  if (!isNewUser) {
    // Existing Office Hub account, same email as this Identity login —
    // auto-link the two (they just proved ownership of the Identity
    // account by signing in with its password), but only ever fill a
    // blank link, never overwrite one already pointing somewhere else.
    // Their existing role is never touched here.
    await webService.from("profiles").update({ platform_public_id: platformAccount.public_id }).eq("id", webUserId).is("platform_public_id", null);
  }

  // Multi-tenancy (migration 0055) — resolve which firm this Platform
  // account gets into. Only ever auto-provisions/joins when there's
  // exactly one unambiguous Studio; zero or two-or-more always defer to
  // the caller's own destination-resolution logic.
  const platformService = createPlatformServiceRoleClient();
  const { count: existingMembershipCount } = await supabase
    .from("profile_firm_memberships")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", webUserId);

  if ((existingMembershipCount ?? 0) === 0) {
    const { data: eligibleMemberships } = await platformService
      .from("studio_memberships")
      .select("studios(id, name, public_id)")
      .eq("account_id", platformAccount.id)
      .eq("status", "ACTIVE");

    type StudioRow = { studios: { id: string; name: string; public_id: string } | null };
    const studios = ((eligibleMemberships ?? []) as unknown as StudioRow[])
      .map((m) => m.studios)
      .filter((s): s is { id: string; name: string; public_id: string } => !!s);

    if (studios.length === 1) {
      const studio = studios[0];
      const { data: existingFirm } = await webService
        .from("firms")
        .select("id")
        .eq("platform_studio_public_id", studio.public_id)
        .maybeSingle();

      if (existingFirm) {
        await supabase.rpc("join_firm", { p_firm_id: existingFirm.id });
      } else {
        await supabase.rpc("provision_firm", {
          p_company_name: studio.name,
          p_platform_studio_public_id: studio.public_id,
        });
      }
    }
  }

  return { webUserId, isNewUser };
}

/**
 * Kept for backward compatibility — the page that used to call this
 * (`aorms.in/login`) now redirects to the unified login at
 * `identity.aorms.in/platform-login` (see app/(auth)/login/page.tsx),
 * which calls `bridgeIdentityToOfficeHub()` above directly. This wrapper
 * still works identically for any stale cached page or bookmarked form
 * post that reaches `signIn()` directly.
 */
async function signInWithIdentity(email: string, password: string): Promise<AuthActionState> {
  // Verify the password against the Platform — this also signs the
  // browser into the Platform's own session as a side effect (the same
  // email+password now works across Office Hub AND every Platform
  // portal), matching "one personal, portable account" being the
  // Platform's own stated design, not an accidental side channel.
  const platform = await createPlatformClient();
  const { data: platformAuth, error: platformError } = await platform.auth.signInWithPassword({ email, password });
  if (platformError || !platformAuth.user) {
    // Same message Supabase's own aorms-web check would have given for a
    // wrong password — doesn't reveal which of the two systems, if
    // either, recognizes this email.
    return { error: "Invalid login credentials" };
  }

  const platformService = createPlatformServiceRoleClient();
  const { data: platformAccount } = await platformService
    .from("accounts")
    .select("id, public_id, full_name")
    .eq("id", platformAuth.user.id)
    .maybeSingle();
  if (!platformAccount) {
    // A real Platform session (Company Account or platform-staff-only —
    // see the 2026-09-14 Company/ConnectDeX identity split) but not a
    // Studio/Identity account. Neither has any Office Hub relationship —
    // a Company Account in particular is a deliberately separate login by
    // this same day's own design.
    return { error: "This AORMS Identity account can't sign into Office Hub — it isn't a Studio/Identity account." };
  }

  const bridged = await bridgeIdentityToOfficeHub(email, platformAccount);
  if ("error" in bridged) return bridged;

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", bridged.webUserId).maybeSingle();

  const destination = await resolveSignInDestination(supabase, bridged.webUserId, platformAccount.public_id);
  // See the matching comment in signIn() above — purges the client Router
  // Cache so a page reached via a post-sign-in nav <Link> can't serve a
  // stale pre-sign-in prefetch. Must run before any redirect() below.
  revalidatePath("/", "layout");
  if (destination) redirect(destination);

  const home = roleHome(profile?.role);
  if (!home) {
    // Sibling of the B1 fix — this function establishes a real Platform
    // session at line ~297 (platform.auth.signInWithPassword) before ever
    // reaching here. Signing out only the just-bridged web session would
    // leave that Platform session live and valid, the same "looks signed
    // out but isn't" gap platformSignOut()/signOut() were fixed for. Uses
    // signOutSafely() (see its own header) so one client throwing can't
    // skip the other.
    await signOutSafely(() => supabase.auth.signOut(), "Office Hub");
    await signOutSafely(() => platform.auth.signOut(), "Platform");
    return { error: "Signed in with your AORMS Identity — this account's Office Hub portal isn't available yet — contact your firm for access." };
  }

  redirect(home);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  const platformSupabase = await createPlatformClient();

  // 2026-09-21 QA re-test found the 2026-09-20 B1 fix (mirrored sign-out
  // of both projects) still failed intermittently (~1-in-4): a bare
  // `await supabase.auth.signOut()` let a transient network throw from
  // ONE client's call abort this whole function before the OTHER client's
  // signOut() ever ran and before redirect() — see signOutSafely()'s own
  // header comment for the exact mechanism (auth-js's admin.signOut()
  // rethrows non-AuthError failures instead of returning {error}). Both
  // calls are now independent: one failing can never skip the other.
  await signOutSafely(() => supabase.auth.signOut(), "Office Hub");
  await signOutSafely(() => platformSupabase.auth.signOut(), "Platform");

  // Purge the client Router Cache so a page reached right after this
  // redirect (or a subsequent navigation in this tab) can't serve a
  // pre-sign-out RSC payload for a route previously prefetched while
  // still signed in — same next/cache mechanism as signIn()'s comment
  // above, other direction. Must run before redirect().
  revalidatePath("/", "layout");
  redirect("/login");
}
