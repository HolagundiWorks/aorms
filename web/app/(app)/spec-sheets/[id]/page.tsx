import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewSpecItemForm } from "../../../../components/aorms/NewSpecItemForm";
import { GeneratePdfButton } from "../../../../components/aorms/GeneratePdfButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import { generateSpecSheetPdf } from "../../../../lib/actions/spec-sheets";

export default async function SpecSheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sheet, error: sheetError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("spec_sheets").select("id, ref, title, status, pdf_status").eq("id", id).maybeSingle(),
    supabase
      .from("spec_items")
      .select("id, category, item, make, specification, finish")
      .eq("spec_sheet_id", id)
      .order("sort_order"),
  ]);

  if (sheetError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load spec sheet: {sheetError.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!sheet) notFound();

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader
          eyebrow={sheet.ref}
          eyebrowMono
          title={sheet.title}
          actions={<GeneratePdfButton action={generateSpecSheetPdf.bind(null, sheet.id)} pdfStatus={sheet.pdf_status} />}
        />

        <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
          Items
        </h2>

        <NewSpecItemForm specSheetId={sheet.id} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load items: {itemsError.message}
          </p>
        ) : (
          <Table aria-label="Spec items" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Category</TableHeader>
                <TableHeader>Item</TableHeader>
                <TableHeader>Make</TableHeader>
                <TableHeader>Specification</TableHeader>
                <TableHeader>Finish</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items ?? []).map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.category ?? "—"}</TableCell>
                  <TableCell>{it.item}</TableCell>
                  <TableCell>{it.make ?? "—"}</TableCell>
                  <TableCell>{it.specification ?? "—"}</TableCell>
                  <TableCell>{it.finish ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No items yet.
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
