import { notFound } from "next/navigation";
import { Column, Grid } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { ProjectTabs } from "../../../../components/aorms/ProjectTabs";

/**
 * Wraps every `/projects/[id]/*` page in the shared tab strip
 * (`ProjectTabs`) — one place to add it rather than 10 individual page
 * edits, and it now covers every future sub-page too. Each page keeps its
 * own `<Grid><Column>`/title/query — this only adds the tab row above
 * that, aligned to the same column span.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase.from("project_offices").select("id").eq("id", id).maybeSingle();
  if (!project) notFound();

  return (
    <>
      <Grid style={{ paddingTop: "1rem" }}>
        <Column sm={4} md={8} lg={16}>
          <ProjectTabs projectId={id} />
        </Column>
      </Grid>
      {children}
    </>
  );
}
