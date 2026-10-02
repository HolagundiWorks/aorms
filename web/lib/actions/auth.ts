"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";
import { roleHome } from "../auth/role-home";
import { checkRateLimitShared, rateLimitIdentifier } from "../security/rate-limit";
import { stampSessionStart, clearSessionStart } from "../supabase/session-cap";
import { bridgeIdentityToOfficeHub, resolveSignInDestination, signOutSafely, type OfficeHubBridgeResult } from "../auth/bridge";

export type AuthActionState = { error: string } | null;


export async function signIn(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const rateLimit = await checkRateLimitShared("signIn", `${await rateLimitIdentifier()}:${email.toLowerCase()}`, {
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
  if (destination) {
    await stampSessionStart();
    redirect(destination);
  }

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

  await stampSessionStart();
  redirect(home);
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
  if (destination) {
    await stampSessionStart();
    redirect(destination);
  }

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

  await stampSessionStart();
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
  await clearSessionStart();

  // Purge the client Router Cache so a page reached right after this
  // redirect (or a subsequent navigation in this tab) can't serve a
  // pre-sign-out RSC payload for a route previously prefetched while
  // still signed in — same next/cache mechanism as signIn()'s comment
  // above, other direction. Must run before redirect().
  revalidatePath("/", "layout");
  redirect("/login");
}
