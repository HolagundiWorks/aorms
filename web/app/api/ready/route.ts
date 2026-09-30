import { NextResponse } from "next/server";

/**
 * Readiness endpoint — the dependency-aware sibling of /api/health.
 * /api/health stays a pure liveness check on purpose (a Supabase blip must
 * never restart a healthy process); this one answers "can this instance
 * actually serve traffic?" by probing each Supabase project's Auth health
 * endpoint (unauthenticated, no data read) with a short timeout. Point
 * uptime *alerting* at this; point process *restarts* only at /api/health.
 * Returns 503 with per-dependency status when anything is unreachable —
 * never any URL, key or error detail.
 */
export const dynamic = "force-dynamic";

async function probe(url: string | undefined, key: string | undefined): Promise<"ok" | "down" | "unconfigured"> {
  if (!url) return "unconfigured";
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      headers: key ? { apikey: key } : undefined,
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
    return res.ok ? "ok" : "down";
  } catch {
    return "down";
  }
}

export async function GET() {
  const [officeHub, platform] = await Promise.all([
    probe(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    probe(process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_URL, process.env.NEXT_PUBLIC_PLATFORM_SUPABASE_ANON_KEY),
  ]);
  const ready = officeHub === "ok" && platform !== "down";
  return NextResponse.json(
    { status: ready ? "ready" : "degraded", checks: { officeHub, platform }, timestamp: new Date().toISOString() },
    { status: ready ? 200 : 503 },
  );
}
