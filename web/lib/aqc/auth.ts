/**
 * Auth for /api/aqc/v1. The AQC desktop client signs in to the Office Hub (Supabase Auth) and sends the access token as a
 * bearer, exactly like the mobile app (lib/supabase/bearer.ts) — so every read and write runs as that user under RLS and
 * AQC never holds a service-role key. Order: token -> user -> firm -> entitlement (D4/D7) -> single active session (D8).
 */
import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { bearerTokenFrom, createBearerClient } from "../supabase/bearer";
import { resolveEntitlement, type Entitlement } from "./entitlement";

export type AqcContext = { supabase: SupabaseClient; user: User; firmId: string; role: string; entitlement: Entitlement; sessionId: string | null };

export const err = (status: number, code: string, message: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: { code, message, ...extra } }, { status });

export async function authenticateAqc(request: Request, opts: { requireSession: boolean }): Promise<AqcContext | NextResponse> {
  const token = bearerTokenFrom(request);
  if (!token) return err(401, "missing_token", "Sign in to AORMS first.");
  const supabase = createBearerClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err(401, "invalid_token", "Your sign-in expired. Sign in again.");

  const { data: profile } = await supabase.from("profiles").select("firm_id, role").eq("id", user.id).maybeSingle();
  if (!profile?.firm_id) return err(403, "no_studio", "This account has no studio in AORMS.");
  if (!["OWNER", "PARTNER", "SENIOR", "ASSOCIATE", "ACCOUNTANT", "HR_MANAGER", "VIEWER", "SITE_SUPERVISOR"].includes(profile.role)) {
    return err(403, "role_not_allowed", "Portal accounts can't use AQC.");
  }

  const entitlement = await resolveEntitlement(supabase, profile.firm_id);
  if (!entitlement.connected) return err(403, "not_connected", "Connected mode isn't available for this studio.", { reason: entitlement.reason, plan: entitlement.plan });

  let sessionId: string | null = null;
  if (opts.requireSession) {
    sessionId = request.headers.get("x-aqc-session");
    const ok = sessionId ? (await supabase.rpc("aqc_touch_session", { p_session: sessionId })).data === true : false;
    if (!ok) return err(409, "session_replaced", "You signed in to AQC on another computer. Sign in here to continue.");
  }
  return { supabase, user, firmId: profile.firm_id, role: profile.role, entitlement, sessionId };
}

export const isCtx = (v: AqcContext | NextResponse): v is AqcContext => !(v instanceof NextResponse);

/** Maps the database function errors to wire errors. */
export function dbError(message: string) {
  if (message.includes("lease_required")) return err(423, "lease_required", "Another user is editing this project, or your edit lease expired.");
  if (message.includes("not authorized")) return err(403, "forbidden", "Your role can't do that.");
  return err(400, "bad_request", message.replace(/^.*?: /, "").slice(0, 200));
}
