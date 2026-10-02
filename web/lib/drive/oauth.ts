/**
 * Google Drive OAuth 2.0 — web-server flow, offline access (refresh
 * token), verified against Google's own docs (developers.google.com/
 * identity/protocols/oauth2/web-server), not guessed. See docs/esti/
 * AORMS-V2-DEVELOPER-GUIDELINES.md § 5-6: identity (Google sign-in via
 * Supabase Auth) stays a SEPARATE concern from this — this module is
 * Drive authorization only, requested as its own onboarding step.
 *
 * `drive.file` scope (not the full `drive` scope) — AORMS can only see
 * files it creates or the user explicitly opens via a Picker, never a
 * firm's whole existing Drive. Deliberately the narrower default; a
 * future "map an existing folder structure" feature (§8) would need to
 * request `drive.readonly` or full `drive` explicitly, as its own
 * documented scope escalation, not assumed here.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export type DriveOAuthState = { studioId: string; accountId: string; nonce: string; exp?: number };

/** Cookie that binds an OAuth round-trip to the browser that started it (see decodeState). */
export const DRIVE_OAUTH_NONCE_COOKIE = "aorms_drive_oauth";
const STATE_TTL_MS = 15 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", requireEnv("GOOGLE_OAUTH_CLIENT_SECRET")).update(`drive-oauth-state:${payload}`).digest("base64url");
}

/**
 * OAuth `state` (2026-10-02 security audit): previously unsigned base64 JSON whose
 * `nonce` was never checked, so an attacker could finish OAuth with their OWN Google
 * account and send a victim a callback link — the victim's session matched the embedded
 * accountId and the victim's Studio got linked to the attacker's Drive (login CSRF).
 * Now HMAC-signed, expiring, and the nonce must also match an httpOnly cookie set only
 * in the browser that started the flow.
 */
export function encodeState(state: DriveOAuthState): string {
  const payload = Buffer.from(JSON.stringify({ ...state, exp: Date.now() + STATE_TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeState(raw: string): DriveOAuthState {
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) throw new Error("Invalid OAuth state");
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) throw new Error("Invalid OAuth state");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
  if (typeof parsed?.studioId !== "string" || typeof parsed?.accountId !== "string" || typeof parsed?.nonce !== "string") {
    throw new Error("Invalid OAuth state");
  }
  if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) throw new Error("OAuth state expired");
  return parsed;
}

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
    response_type: "code",
    scope: DRIVE_SCOPE,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_OAUTH_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token refresh failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.json();
}

/** Fetches the connected Google account's email — stored on drive_connections for display, never used for auth decisions. */
export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}
