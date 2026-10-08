import { NextResponse } from "next/server";
import { authenticateAqc, err, isCtx } from "../../../../../lib/aqc/auth";
import { AQC_CONTRACT_VERSION, SessionBody } from "../../../../../lib/aqc/contract";

const CAPS = ["write", "fees:manage", "cost:approve"] as const;

async function describe(ctx: Exclude<Awaited<ReturnType<typeof authenticateAqc>>, Response>, sessionId: string | null) {
  const caps = await Promise.all(CAPS.map(async (c) => [c, (await ctx.supabase.rpc("has_capability", { cap: c })).data === true] as const));
  const { data: firm } = await ctx.supabase.from("firms").select("id, company_name").eq("id", ctx.firmId).maybeSingle();
  return {
    contract: AQC_CONTRACT_VERSION,
    sessionId,
    account: { id: ctx.user.id, email: ctx.user.email ?? null },
    studio: { firmId: ctx.firmId, name: firm?.company_name ?? "", publicId: ctx.entitlement.studioPublicId },
    role: ctx.role,
    capabilities: Object.fromEntries(caps),
    entitlement: { connected: ctx.entitlement.connected, plan: ctx.entitlement.plan, expiresAt: ctx.entitlement.expiresAt },
  };
}

/** POST: sign in — starts the account's single active session (a previous one is replaced). */
export async function POST(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: false });
  if (!isCtx(ctx)) return ctx;
  const body = SessionBody.safeParse(await request.json().catch(() => ({})));
  if (!body.success) return err(400, "bad_request", "Invalid request.");
  const { data: sessionId, error } = await ctx.supabase.rpc("aqc_start_session", { p_client_label: body.data.clientLabel ?? null });
  if (error || !sessionId) return err(400, "bad_request", "Could not start a session.");
  return NextResponse.json(await describe(ctx, sessionId as string));
}

/** GET: is my session still the current one, and am I still entitled? */
export async function GET(request: Request) {
  const ctx = await authenticateAqc(request, { requireSession: true });
  if (!isCtx(ctx)) return ctx;
  return NextResponse.json(await describe(ctx, ctx.sessionId));
}
