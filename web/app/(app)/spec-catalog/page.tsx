import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { NewSpecCatalogVersionForm } from "../../../components/aorms/NewSpecCatalogVersionForm";
import { SetActiveVersionButton } from "../../../components/aorms/SetActiveVersionButton";

/**
 * Spec Catalog (Library → Specification) — CLAUDE.md's own module map
 * names this ("specCatalog — specification material catalogue") — genuinely
 * missing from `web/` entirely until migration 0025. Distinct from
 * `/spec-sheets` (a project's own spec documents) — this is the firm's
 * versioned reference catalogue those documents pick items from.
 */
export default async function SpecCatalogPage() {
  const supabase = await createClient();

  const { data: versions, error } = await supabase
    .from("spec_catalog_versions")
    .select("id, label, description, active")
    .order("label", { ascending: false });

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Spec Catalog</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          Versioned material specification catalogue — category/item/make/specification/finish rows
          that project spec sheets pick from. Only one version is active at a time.
        </p>

        <NewSpecCatalogVersionForm />

        {error ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load versions: {error.message}
          </p>
        ) : (
          <Table aria-label="Spec catalog versions" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Label</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Actions</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(versions ?? []).map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <Link href={`/spec-catalog/${v.id}`}>{v.label}</Link>
                  </TableCell>
                  <TableCell>{v.description ?? "—"}</TableCell>
                  <TableCell>
                    <Tag type={v.active ? "green" : "cool-gray"} size="sm">
                      {v.active ? "Active" : "Inactive"}
                    </Tag>
                  </TableCell>
                  <TableCell>{!v.active && <SetActiveVersionButton versionId={v.id} />}</TableCell>
                </TableRow>
              ))}
              {(versions ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No catalogue versions yet.
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
