import { NextResponse } from "next/server";
import { err } from "../../../../../../lib/aqc/auth";
import { aqcLogin, LoginBody } from "../../../../../../lib/aqc/login";
import { checkRateLimitShared, rateLimitIdentifier } from "../../../../../../lib/security/rate-limit";

/**
 * POST {email, password}: sign in for the AQC client and get hub tokens. Rate-limited per address and per caller (8 tries / 15 min,
 * same as the web sign-in). Then call POST /session with `Authorization: Bearer <accessToken>` to start the single active session;
 * refresh with Supabase's own refresh-token grant (see GET /config for the public URL and key).
 */
export async function POST(request: Request) {
  const body = LoginBody.safeParse(await request.json().catch(() => null));
  if (!body.success) return err(400, "bad_request", "Send an email and a password.");
  const email = body.data.email.toLowerCase();
  const limit = await checkRateLimitShared("aqcLogin", `${await rateLimitIdentifier()}:${email}`, { max: 8, windowMs: 15 * 60 * 1000 });
  if (!limit.ok) return err(429, "rate_limited", `Too many attempts — try again in ${limit.retryAfterSeconds}s.`, { retryAfterSeconds: limit.retryAfterSeconds });
  const r = await aqcLogin(email, body.data.password);
  if (!r.ok) return err(r.status, r.code, r.message);
  return NextResponse.json(r.tokens);
}
