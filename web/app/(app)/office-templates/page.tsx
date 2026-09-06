import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewOfficeTemplateForm } from "../../../components/aorms/NewOfficeTemplateForm";

const KIND_LABEL: Record<string, string> = {
  LETTER: "Letter",
  SCOPE: "Scope of work",
  COA: "COA fee proposal",
  CONTRACT: "Contract / agreement",
  MOM: "Meeting minutes",
};

/**
 * Office Templates — reusable letter/scope/COA/contract/MOM boilerplate.
 * Phase 4's own flagged gap ("office_templates" not built) — the table
 * existed with RLS the whole time, no UI at all until now.
 */
export default async function OfficeTemplatesPage() {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("office_templates")
    .select("id, kind, title, tags")
    .order("updated_at", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Office Templates</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Reusable boilerplate for letters, scope of work, COA fee proposals, contracts, and meeting minutes.
        </p>

        <NewOfficeTemplateForm />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load templates: {error.message}
          </p>
        ) : (
          <Table aria-label="Office templates" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Kind</TableHeader>
                <TableHeader>Title</TableHeader>
                <TableHeader>Tags</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(templates ?? []).map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Tag type="outline" size="sm">
                      {KIND_LABEL[t.kind] ?? t.kind}
                    </Tag>
                  </TableCell>
                  <TableCell>
                    <Link href={`/office-templates/${t.id}`}>{t.title}</Link>
                  </TableCell>
                  <TableCell>{t.tags ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(templates ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No templates yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
