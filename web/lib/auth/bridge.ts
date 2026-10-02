/**
 * Session-minting helpers for the Office Hub <-> Platform bridge.
 *
 * Moved out of lib/actions/auth.ts on 2026-10-02 (security audit): that file is
 * `"use server"`, so EVERY export of it is a Server Action — a network-callable
 * endpoint. `bridgeIdentityToOfficeHub` creates accounts/profiles and mints a session
 * for an arbitrary email using the service role; it must only ever be reachable from
 * trusted server code (the sign-in actions and the OAuth callback route), never as a
 * public action. This file deliberately has NO "use server" directive.
 */
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { roleHome } from "./role-home";

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


export type PlatformBridgeResult =
  | { platformAccountId: string; platformPublicId: string; isNewAccount: boolean }
  | { error: string };

/**
 * The reverse of auth.ts's `bridgeIdentityToOfficeHub()` — establishes
 * (or, since this always creates a brand-new account, more precisely
 * "provisions") an aorms-platform session for an ALREADY-verified Office
 * Hub account. Built 2026-09-20 when `identity.aorms.in/platform-login`
 * became the one unified login page for both systems (explicit user
 * direction: "confusion with login page aorms.in/login and
 * identity.aorms.in, keep one page[,] improve security") — before this,
 * an Office-Hub-only password (never linked to a personal AORMS Identity)
 * simply didn't work here at all, which was the actual confusion.
 *
 * Same safety shape as the forward bridge: a freshly created `accounts`
 * row defaults to `level = 'BASIC'` and has no admin-related column at
 * all (admin status lives only in `platform_staff`, which has no
 * self-serve grant path — confirmed against the live schema before
 * writing this) — so "a matching Identity account now exists" can never
 * mean "elevated Platform access was granted," the same invariant the
 * forward bridge relies on for Office Hub roles.
 */
export async function bridgeOfficeHubToIdentity(email: string, webUserId: string): Promise<PlatformBridgeResult> {
  const webService = createServiceRoleClient();
  const platformService = createPlatformServiceRoleClient();

  // Idempotency check — without this, every sign-in after the first for
  // the same Office-Hub-only account would fail: the bridged Platform
  // account has a random, unknown password, so the platform-password
  // check in platformSignIn() below always falls through to here again,
  // and a naive unconditional createUser() would hit email_exists on its
  // own previously-created account and wrongly report it as a foreign
  // account with a different password. If this profile is already linked
  // (profiles.platform_public_id set — by this bridge or any other path),
  // reuse that account instead of trying to create a new one.
  const { data: webProfile } = await webService.from("profiles").select("platform_public_id").eq("id", webUserId).maybeSingle();
  let account: { id: string; public_id: string } | null = null;
  if (webProfile?.platform_public_id) {
    const { data: linkedAccount } = await platformService
      .from("accounts")
      .select("id, public_id")
      .eq("public_id", webProfile.platform_public_id)
      .maybeSingle();
    account = linkedAccount ?? null;
  }

  let isNewAccount = false;
  if (!account) {
    const { data: createdAccount, error: createErr } = await platformService.auth.admin.createUser({
      email,
      // Never surfaced to anyone — this account signs in via its Office
      // Hub password from here on, same pattern bridgeIdentityToOfficeHub()
      // already uses in the other direction.
      password: crypto.randomUUID() + crypto.randomUUID(),
      email_confirm: true,
    });

    if (createErr) {
      if (createErr.code === "email_exists") {
        // A Platform account already exists for this email, and it's NOT
        // the one linked to this Office Hub profile (the lookup above
        // would have found it otherwise) — a genuinely different,
        // foreign account. A clear, actionable message, not a generic
        // "invalid credentials" one, since this person does have real
        // Platform access, just not with the password they just typed.
        return { error: "This email already has an AORMS Identity account with a different password — use that password, or reset it." };
      }
      return { error: "Couldn't sign in — please try again." };
    }

    const { data: newAccount } = await platformService.from("accounts").select("id, public_id").eq("id", createdAccount.user.id).maybeSingle();
    if (!newAccount) {
      return { error: "Couldn't finish setting up your account — please try again." };
    }
    account = newAccount;
    isNewAccount = true;
  }

  const { data: linkData, error: linkErr } = await platformService.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !linkData.properties.hashed_token) {
    return { error: "Couldn't sign in — please try again." };
  }

  const platform = await createPlatformClient();
  const { error: verifyErr } = await platform.auth.verifyOtp({ token_hash: linkData.properties.hashed_token, type: "magiclink" });
  if (verifyErr) {
    return { error: "Couldn't sign in — please try again." };
  }

  if (isNewAccount) {
    // Link the Office Hub profile to this brand-new Identity, but only
    // ever fill a blank link — same "never overwrite" carefulness the
    // forward bridge uses.
    await webService.from("profiles").update({ platform_public_id: account.public_id }).eq("id", webUserId).is("platform_public_id", null);

    // Audit-logged (unlike the rest of this file's platform-side
    // mutations — see this file's own header comment on why those don't
    // call write_audit) because this one writes to web/'s own profiles
    // table, same reasoning linkPlatformIdentity() above already
    // documents, and because a brand-new Identity account materializing
    // from an Office Hub login is exactly the kind of cross-system event
    // worth a traceable record, not silent.
    const webSupabase = await createClient();
    await webSupabase.rpc("write_audit", {
      p_entity: "profile",
      p_entity_id: webUserId,
      p_action: "UPDATE",
      p_before: null,
      p_after: { platform_public_id: account.public_id, source: "bridgeOfficeHubToIdentity" },
    });
  }

  return { platformAccountId: account.id, platformPublicId: account.public_id, isNewAccount };
}

