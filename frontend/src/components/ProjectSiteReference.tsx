import {
  InlineNotification,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { PROGRAM_SPACE_CATEGORY_LABEL, formatINR } from "@esti/contracts";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { StatusDot } from "../carbon/adapters/index.js";
import { trpc } from "../lib/trpc.js";

function area(n: number | null | undefined): string {
  if (n == null) return "—";
  return (Number.isInteger(n) ? n : Number(n.toFixed(2))).toLocaleString("en-IN");
}
function floorLabel(level: number): string {
  if (level === 0) return "Ground";
  if (level < 0) return `Basement ${Math.abs(level)}`;
  return `Floor ${level}`;
}

/**
 * Read-only "Program & feasibility" reference for site delivery. Wave 3 (Carbon).
 * The site never edits here — it reads the agreed feasibility + frozen program.
 */
export function ProjectSiteReference({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const q = trpc.program.siteReference.useQuery({ projectId });
  const data = q.data;

  if (q.isLoading) return <p className="esti-label--secondary">Loading reference…</p>;
  if (!data || (!data.assessment && !data.program)) {
    return (
      <Stack gap={3}>
        {!compact && (
          <h4 className="cds--type-heading-03" style={{ margin: 0 }}>
            Program &amp; feasibility
          </h4>
        )}
        <p className="esti-label--secondary">
          No feasibility assessment or frozen program yet. Once the feasibility is recorded and
          the program is frozen, the agreed baseline appears here as the site reference.
        </p>
      </Stack>
    );
  }

  const a = data.assessment;
  const p = data.program;

  return (
    <CarbonScope>
      <Stack gap={6}>
        {!compact && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <h4 className="cds--type-heading-03" style={{ margin: 0 }}>
              Program &amp; feasibility
            </h4>
            {p && <StatusDot color="green" label={`Program v${p.version} · frozen`} />}
          </div>
        )}

        <InlineNotification
          kind="info"
          lowContrast
          hideCloseButton
          title="Source of truth"
          subtitle="The feasibility envelope and frozen program are the agreed baseline for site delivery. This view is read-only — changes are made upstream in the Pipeline and Program tabs."
        />

        {a && (
          <Stack gap={3}>
            <h5 className="cds--type-heading-compact-01" style={{ margin: 0 }}>
              Feasibility envelope
            </h5>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                gap: "0.25rem",
              }}
            >
              {[
                { label: "Site area", value: `${area(a.siteAreaSqm)} sqm` },
                { label: "Permissible FAR area", value: `${area(a.permissibleFarArea)} sqm` },
                { label: "Max built extent", value: `${area(a.superBuiltupArea)} sqm` },
                { label: "Possible floors", value: area(a.possibleFloors) },
                { label: "Ground coverage", value: `${area(a.actualGroundCoverage)} sqm` },
                { label: "Est. project cost", value: formatINR(a.estimatedProjectCostPaise, { paise: false }) },
              ].map((k) => (
                <div key={k.label} style={{ padding: "0.5rem", borderBottom: "1px solid var(--cds-border-subtle)" }}>
                  <p className="esti-label--secondary" style={{ margin: 0 }}>
                    {k.label}
                  </p>
                  <p className="cds--type-heading-compact-01" style={{ margin: "0.25rem 0 0" }}>
                    {k.value}
                  </p>
                </div>
              ))}
            </div>
          </Stack>
        )}

        {p ? (
          <Stack gap={3}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <h5 className="cds--type-heading-compact-01" style={{ margin: 0 }}>
                Frozen program (v{p.version})
              </h5>
              <StatusDot color="gray" label={`${area(p.totalProgrammedAreaSqm)} sqm · ${p.floorsUsed} floors`} />
              {p.overEnvelope && <StatusDot color="red" label="Over envelope" />}
            </div>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Space</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Floor</TableHeader>
                  <TableHeader>Count</TableHeader>
                  <TableHeader>Area</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {p.spaces.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>
                      {PROGRAM_SPACE_CATEGORY_LABEL[
                        s.category as keyof typeof PROGRAM_SPACE_CATEGORY_LABEL
                      ] ?? s.category}
                    </TableCell>
                    <TableCell>{floorLabel(s.floorLevel)}</TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell>{area(s.areaSqm)} sqm</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Stack>
        ) : (
          <p className="esti-label--secondary">
            No frozen program yet — freeze a program version in the Program tab to publish the
            agreed space schedule to the site.
          </p>
        )}
      </Stack>
    </CarbonScope>
  );
}
