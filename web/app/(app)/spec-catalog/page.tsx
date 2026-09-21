import { CheckmarkFilled, VersionMajor } from "@carbon/icons-react";
import Link from "next/link";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { AddSpecCatalogVersionForm } from "../../../components/aorms/AddSpecCatalogVersionForm";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { SetActiveVersionButton } from "../../../components/aorms/SetActiveVersionButton";

/**
 * Spec Catalog (Library → Specification) — CLAUDE.md's own module map
 * names this ("specCatalog — specification material catalogue") — genuinely
 * missing from `web/` entirely until migration 0025. Distinct from
 * `/spec-sheets` (a project's own spec documents) — this is the firm's
 * versioned reference catalogue those documents pick items from.
 */
// Roles with has_capability('write') (rank >= 40, or an explicit
// allow-list role — see web/supabase/migrations/0002_capability_helper.sql
// and migration 0085_write_policies_require_capability.sql's
// "spec_catalog_versions: staff write" policy). Gates the "New version"
// trigger the same way Clients/Contractors/Projects already gate their
// own create triggers — found missing here by a 2026-09-21 sweep of every
// /app/(app)/*/page.tsx with an unguarded ContextPanelTrigger after the
// same class of bug was confirmed live on Tasks/Leads/Letters.
const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

export default async function SpecCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: versions, error }, { data: myProfile }] = await Promise.all([
    supabase.from("spec_catalog_versions").select("id, label, description, active").order("label", { ascending: false }),
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const canWrite = !!myProfile && WRITE_TIER_ROLES.has(myProfile.role);

  const rows = versions ?? [];
  const activeCount = rows.filter((v) => v.active).length;

  return (
    <ContextPanelLayout>
      {canWrite && (
        <ContextPanel title="New catalogue version" description="Start a new spec catalogue version.">
          <AddSpecCatalogVersionForm />
        </ContextPanel>
      )}
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Spec Catalog"
              description="Versioned material specification catalogue — category/item/make/specification/finish rows that project spec sheets pick from. Only one version is active at a time."
              actions={canWrite ? <ContextPanelTrigger size="sm">New version</ContextPanelTrigger> : undefined}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Total versions" value={rows.length} icon={VersionMajor} />
              <KpiTile label="Active" value={activeCount} icon={CheckmarkFilled} />
            </div>

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
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
