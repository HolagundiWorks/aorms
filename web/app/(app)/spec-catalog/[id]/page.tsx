import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewSpecCatalogItemForm } from "../../../../components/aorms/NewSpecCatalogItemForm";
import { RemoveLineItemButton } from "../../../../components/aorms/RemoveLineItemButton";
import { removeSpecCatalogItem } from "../../../../lib/actions/spec-catalog";

export default async function SpecCatalogVersionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: version, error: versionError } = await supabase
    .from("spec_catalog_versions")
    .select("id, label, description, active")
    .eq("id", id)
    .maybeSingle();

  if (versionError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load version: {versionError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!version) notFound();

  const { data: items, error: itemsError } = await supabase
    .from("spec_catalog_items")
    .select("id, category, item, make, specification, finish, remarks")
    .eq("version_id", id)
    .order("sort_order");

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {version.label}
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "2rem" }}>
          <Tag type={version.active ? "green" : "cool-gray"} size="sm">
            {version.active ? "Active" : "Inactive"}
          </Tag>
          {version.description && (
            <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
              {version.description}
            </span>
          )}
        </div>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Items
        </h2>
        <NewSpecCatalogItemForm versionId={version.id} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load items: {itemsError.message}
          </p>
        ) : (
          <div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
          <Table aria-label="Spec catalog items" className="aorms-table-spaced" size="sm">
            <TableHead>
              <TableRow>
                <TableHeader>Category</TableHeader>
                <TableHeader>Item</TableHeader>
                <TableHeader>Make</TableHeader>
                <TableHeader>Specification</TableHeader>
                <TableHeader>Finish</TableHeader>
                <TableHeader>Remarks</TableHeader>
                <TableHeader>Actions</TableHeader>
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
                  <TableCell>{it.remarks ?? "—"}</TableCell>
                  <TableCell>
                    <RemoveLineItemButton action={removeSpecCatalogItem.bind(null, it.id, version.id)} />
                  </TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No items yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </Column>
    </Grid>
  );
}
