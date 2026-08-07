import {
  Alert,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { StatusDot } from "@hcw/ui-kit";
import { PROGRAM_SPACE_CATEGORY_LABEL, formatINR } from "@esti/contracts";
import { COMPOSITION_RHYTHM } from "../lib/composition.js";
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
 * Read-only "Program & feasibility" reference for site delivery.
 * The site never edits here — it reads the agreed feasibility + frozen program.
 */
export function ProjectSiteReference({ projectId, compact = false }: { projectId: string; compact?: boolean }) {
  const q = trpc.program.siteReference.useQuery({ projectId });
  const data = q.data;

  if (q.isLoading) return <Typography color="text.secondary">Loading reference…</Typography>;
  if (!data || (!data.assessment && !data.program)) {
    return (
      <Stack spacing={COMPOSITION_RHYTHM.xs}>
        {!compact && (
          <Typography variant="h6" component="h4" sx={{ m: 0 }}>
            Program &amp; feasibility
          </Typography>
        )}
        <Typography color="text.secondary">
          No feasibility assessment or frozen program yet. Once the feasibility is recorded and
          the program is frozen, the agreed baseline appears here as the site reference.
        </Typography>
      </Stack>
    );
  }

  const a = data.assessment;
  const p = data.program;

  // Odd peer group (5) — drop ground coverage from the strip; still in full program elsewhere.
  const envelopeFacts = a
    ? [
        { label: "Site area", value: `${area(a.siteAreaSqm)} sqm` },
        { label: "Permissible FAR area", value: `${area(a.permissibleFarArea)} sqm` },
        { label: "Max built extent", value: `${area(a.superBuiltupArea)} sqm` },
        { label: "Possible floors", value: area(a.possibleFloors) },
        { label: "Est. project cost", value: formatINR(a.estimatedProjectCostPaise, { paise: false }) },
      ]
    : [];

  return (
    <Stack spacing={COMPOSITION_RHYTHM.lg}>
      {!compact && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography variant="h6" component="h4" sx={{ m: 0 }}>
            Program &amp; feasibility
          </Typography>
          {p && <StatusDot color="green" label={`Program v${p.version} · frozen`} />}
        </Box>
      )}

      <Alert severity="info">
        The feasibility envelope and frozen program are the agreed baseline for site delivery.
        This view is read-only — changes are made upstream in the Pipeline and Program tabs.
      </Alert>

      {a && (
        <Stack spacing={COMPOSITION_RHYTHM.xs}>
          <Typography variant="subtitle2" sx={{ m: 0 }}>
            Feasibility envelope
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 1,
            }}
          >
            {envelopeFacts.map((k) => (
              <Box
                key={k.label}
                sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {k.label}
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                  {k.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Stack>
      )}

      {p ? (
        <Stack spacing={COMPOSITION_RHYTHM.xs}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="subtitle2" sx={{ m: 0 }}>
              Frozen program (v{p.version})
            </Typography>
            <StatusDot color="gray" label={`${area(p.totalProgrammedAreaSqm)} sqm · ${p.floorsUsed} floors`} />
            {p.overEnvelope && <StatusDot color="red" label="Over envelope" />}
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Space</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Floor</TableCell>
                <TableCell>Count</TableCell>
                <TableCell>Area</TableCell>
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
        <Typography color="text.secondary">
          No frozen program yet — freeze a program version in the Program tab to publish the
          agreed space schedule to the site.
        </Typography>
      )}
    </Stack>
  );
}
