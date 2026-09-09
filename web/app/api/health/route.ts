import { NextResponse } from "next/server";

/**
 * Liveness endpoint for Hostinger Managed App Hosting's uptime monitoring
 * (2026-09-09 hosting-prep audit — no health route existed before this).
 * Deliberately does NOT touch Supabase or Ollama: a liveness check answers
 * "is the Node process up and serving requests", not "are its dependencies
 * healthy" — conflating the two means a transient Supabase blip restarts a
 * perfectly fine app process. Dependency health belongs in a separate
 * readiness check if Hostinger's monitoring ever needs one; nothing today
 * calls for it, so it isn't built speculatively.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
