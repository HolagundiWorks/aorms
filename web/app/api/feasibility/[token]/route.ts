import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../../lib/supabase/service";

/**
 * Public, unauthenticated read of a feasibility report's frozen snapshot by
 * share token — finishes the half-built feature the Phase 10 audit flagged:
 * `shareToken` was minted on every `generate` call but nothing ever read it
 * back. Deliberately serves ONLY `snapshot` (the frozen JSON, safe to share)
 * — never the row's internal ids, pdf_key, or created_by_id.
 *
 * No RLS applies here: a share token isn't a Supabase Auth session, so RLS
 * has no session to key off of for an anonymous visitor. The service-role
 * client is used instead, with the token itself as the entire authorization
 * check — anyone holding a valid 32-char hex token can read that one report.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!/^[0-9a-f]{32}$/.test(token)) {
    return NextResponse.json({ error: "Invalid share token." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("feasibility_reports")
    .select("snapshot, generated_at")
    .eq("share_token", token)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json({ snapshot: data.snapshot, generatedAt: data.generated_at });
}
