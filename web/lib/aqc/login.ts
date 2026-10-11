/**
 * Token sign-in for the AQC desktop client. The Office Hub signs people in two ways (lib/actions/auth.ts): a direct hub
 * password, or an AORMS Identity (Platform) password that the server bridges into a hub session. A desktop app can only
 * do the first by itself, so this does both on its behalf and returns the hub tokens (no cookies).
 *
 * Deliberately narrower than the web bridge: it never creates or links an account. An Identity-only user must have signed in
 * to the web hub once (which creates/links their hub account); until then this returns `not_linked`. The session is minted
 * the same way the web does it — generateLink + verifyOtp — for the hub user already linked to the verified Platform account.
 */
import { createClient as createSupabase, type Session } from "@supabase/supabase-js";
import { z } from "zod";
import { createServiceRoleClient as createHubService } from "../supabase/service";
import { createServiceRoleClient as createPlatformService } from "../platform/service";

export const LoginBody = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });

export type LoginTokens = { accessToken: string; refreshToken: string; expiresAt: number; userId: string; email: string };
export type LoginResult = { ok: true; tokens: LoginTokens } | { ok: false; status: number; code: string; message: string };

const BAD: LoginResult = { ok: false, status: 401, code: "invalid_credentials", message: "Invalid login credentials." };

const stateless = (url: string, anon: string) => createSupabase(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
const hubClient = () => stateless(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const platformClient = () => stateless(process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL!, process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY!);

function tokensFrom(session: Session | null, email: string): LoginResult {
  if (!session) return BAD;
  return { ok: true, tokens: { accessToken: session.access_token, refreshToken: session.refresh_token, expiresAt: session.expires_at ?? 0, userId: session.user.id, email: session.user.email ?? email } };
}

export async function aqcLogin(email: string, password: string): Promise<LoginResult> {
  // 1. Direct hub password.
  const hub = hubClient();
  const direct = await hub.auth.signInWithPassword({ email, password });
  if (!direct.error && direct.data.session) return tokensFrom(direct.data.session, email);

  // 2. AORMS Identity password, bridged to an already-linked hub account.
  try {
    const platform = platformClient();
    const { data: p, error: pErr } = await platform.auth.signInWithPassword({ email, password });
    if (pErr || !p.user) return BAD;
    const { data: account } = await createPlatformService().from("accounts").select("id, public_id").eq("id", p.user.id).maybeSingle();
    if (!account) return BAD;

    const hubService = createHubService();
    const { data: profile } = await hubService.from("profiles").select("id, role").eq("platform_public_id", account.public_id).maybeSingle();
    if (!profile) return { ok: false, status: 403, code: "not_linked", message: "Sign in to AORMS on the web once with this account, then try again." };
    if (profile.role === "PENDING") return { ok: false, status: 403, code: "pending", message: "Your studio hasn't approved your access yet." };

    const { data: hubUser } = await hubService.auth.admin.getUserById(profile.id);
    const hubEmail = hubUser?.user?.email;
    if (!hubEmail) return BAD;
    const { data: link, error: linkErr } = await hubService.auth.admin.generateLink({ type: "magiclink", email: hubEmail });
    if (linkErr || !link.properties.hashed_token) return BAD;
    const { data: verified, error: vErr } = await hub.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
    if (vErr) return BAD;
    return tokensFrom(verified.session, hubEmail);
  } catch {
    return { ok: false, status: 503, code: "unavailable", message: "Sign-in isn't available right now. Try again shortly." };
  }
}
