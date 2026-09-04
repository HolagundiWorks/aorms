import {
  Column,
  Grid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { ComplianceForm } from "../../../components/aorms/ComplianceForm";
import { complianceFields, type ComplianceTable } from "../../../lib/compliance-fields";

const SECTIONS: { table: ComplianceTable; label: string; columns: string[] }[] = [
  { table: "compliance_far", label: "FAR", columns: ["zone", "plot_type", "far", "ground_coverage_pct", "max_height_m"] },
  { table: "compliance_setback", label: "Setbacks", columns: ["zone", "plot_type", "front_m", "rear_m", "side1_m", "side2_m"] },
  { table: "compliance_nbc", label: "NBC", columns: ["clause", "title", "applicability"] },
  { table: "compliance_fire", label: "Fire", columns: ["building_type", "height_band_m", "staircase_width_m"] },
  { table: "compliance_regulation", label: "Regulations", columns: ["authority", "ref_no", "title"] },
];

/**
 * compliance_docs (the sixth sub-table, file-upload records) isn't built
 * here — no upload Route Handler exists in this app yet, same gap the
 * Drawings register page already flagged for its own file uploads.
 */
export default async function CompliancePage() {
  const supabase = await createClient();

  const results = await Promise.all(
    SECTIONS.map((s) => supabase.from(s.table).select(["id", ...s.columns].join(",")).order("created_at", { ascending: false })),
  );

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05">Compliance Library</h1>
        <p
          className="cds--type-body-01"
          style={{ marginTop: "0.5rem", marginBottom: "1.5rem", color: "var(--cds-text-secondary)" }}
        >
          FAR, setbacks, NBC clauses, fire code, and regulatory references.
        </p>

        <Tabs>
          <TabList aria-label="Compliance sections">
            {SECTIONS.map((s) => (
              <Tab key={s.table}>{s.label}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {SECTIONS.map((s, i) => {
              const { data: rows, error } = results[i] as { data: Record<string, unknown>[] | null; error: { message: string } | null };
              return (
                <TabPanel key={s.table}>
                  <div style={{ paddingTop: "1.5rem" }}>
                    <ComplianceForm table={s.table} fields={complianceFields(s.table)} />
                    {error ? (
                      <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                        Couldn&apos;t load rows: {error.message}
                      </p>
                    ) : (
                      <Table aria-label={s.label} size="sm">
                        <TableHead>
                          <TableRow>
                            {s.columns.map((c) => (
                              <TableHeader key={c}>{c.replace(/_/g, " ")}</TableHeader>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(rows ?? []).map((r) => (
                            <TableRow key={String(r.id)}>
                              {s.columns.map((c) => (
                                <TableCell key={c}>{r[c] === null || r[c] === undefined ? "—" : String(r[c])}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                          {(rows ?? []).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={s.columns.length}>
                                <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                                  No rows yet.
                                </p>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </TabPanel>
              );
            })}
          </TabPanels>
        </Tabs>
      </Column>
    </Grid>
  );
}
