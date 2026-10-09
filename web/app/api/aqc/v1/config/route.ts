import { NextResponse } from "next/server";
import { AQC_CONTRACT_VERSION } from "../../../../../lib/aqc/contract";

/** GET (no auth): what the AQC client needs to talk to this deployment. The URL and anon key are the public ones the web app ships. */
export async function GET() {
  return NextResponse.json({
    contract: AQC_CONTRACT_VERSION,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
    endpoints: { login: "/api/aqc/v1/auth/login", session: "/api/aqc/v1/session", projects: "/api/aqc/v1/projects" },
    limits: { rowBatch: 500, maxRowsPerProject: 20000, maxFileBytes: 25 * 1024 * 1024, leaseSeconds: 120 },
  });
}
