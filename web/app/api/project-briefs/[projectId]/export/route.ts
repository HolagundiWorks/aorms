import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";

/**
 * Authenticated export of the compiled brief as markdown — mirrors
 * backend/src/modules/project-brief/router.ts's exportCompiled exactly
 * (same section order, same JSON-dump-per-section format). Unlike the
 * Phase 10 feasibility share route, this one is NOT public: it uses the
 * normal cookie-based Supabase client, so RLS (is_office_staff()) applies
 * — a project brief isn't meant to be anonymously shareable.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [{ data: brief }, { data: project }] = await Promise.all([
    supabase.from("project_briefs").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("project_offices").select("ref, title").eq("id", projectId).maybeSingle(),
  ]);

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const lines = [
    `# Project design brief — ${project.ref} ${project.title}`,
    "",
    "## Basic information",
    JSON.stringify(brief?.basic_info ?? {}, null, 2),
    "",
    "## Project information",
    JSON.stringify(brief?.project_info ?? {}, null, 2),
    "",
    "## Occupants",
    JSON.stringify(brief?.occupants ?? {}, null, 2),
    "",
    "## Design preferences",
    JSON.stringify(brief?.design_prefs ?? {}, null, 2),
    "",
    "## Accommodation schedule",
    JSON.stringify(brief?.space_schedule ?? [], null, 2),
    "",
    "## Room details",
    JSON.stringify(brief?.room_details ?? [], null, 2),
    "",
    "## Materials",
    JSON.stringify(brief?.materials ?? {}, null, 2),
    "",
    "## Assumptions",
    brief?.assumptions ?? "",
    "",
    "## Approval",
    brief?.approval_note ?? "",
    brief?.approved_at ? `Approved: ${brief.approved_at}` : "",
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${project.ref.replace(/\//g, "-")}-brief.md"`,
    },
  });
}
