import { notFound } from "next/navigation";
import { Column, Grid } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { EditOfficeTemplateForm } from "../../../../components/aorms/EditOfficeTemplateForm";
import { DeleteOfficeTemplateButton } from "../../../../components/aorms/DeleteOfficeTemplateButton";

export default async function OfficeTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("office_templates")
    .select("id, kind, title, body, tags")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load template: {error.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!template) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={12}>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "1.5rem" }}>
          {template.title}
        </h1>

        <EditOfficeTemplateForm template={template} />

        <div style={{ marginTop: "2rem" }}>
          <DeleteOfficeTemplateButton id={template.id} />
        </div>
      </Column>
    </Grid>
  );
}
