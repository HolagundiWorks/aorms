"use server";

import { redirect } from "next/navigation";
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
async function resolveSignInDestination(
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
  if (destination) redirect(destination);

  const home = roleHome(profile?.role);
  if (!home) {
    await supabase.auth.signOut();
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
  // exactly one unambiguous Studio; zero or two-or-more always defer
  // (0 → the existing "not available yet" sign-out below; 2+ → the
  // picker via resolveSignInDestination(), never guessed here).
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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", webUserId).maybeSingle();

  const destination = await resolveSignInDestination(supabase, webUserId, platformAccount.public_id);
  if (destination) redirect(destination);

  const home = roleHome(profile?.role);
  if (!home) {
    await supabase.auth.signOut();
    return { error: "Signed in with your AORMS Identity — this account's Office Hub portal isn't available yet — contact your firm for access." };
  }

  redirect(home);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
