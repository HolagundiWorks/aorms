import { Alert, AlertTitle, Button, Stack, TextField, Typography } from "@mui/material";
import {
  DEFAULT_BEAM_DEPTH_MM,
  DEFAULT_LINTEL_HEIGHT_MM,
  DEFAULT_SLAB_THICKNESS_MM,
  deriveElementHeightMm,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc.js";

function mmToM(mm: number): string {
  return (mm / 1000).toFixed(3);
}

function mToMm(value: string): number | null {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000);
}

/**
 * Project Setup — slab / beam / lintel deductions that drive auto column & wall heights.
 */
export function ProjectStructuralDefaultsPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const defaultsQ = trpc.measurement.getStructuralDefaults.useQuery({ projectId }, { enabled: !!projectId });
  const levelsQ = trpc.measurement.listLevels.useQuery({ projectId }, { enabled: !!projectId });
  const [syncedRows, setSyncedRows] = useState(0);
  const save = trpc.measurement.upsertStructuralDefaults.useMutation({
    meta: { errorTitle: "Couldn't save the structural defaults" },
    onSuccess: (res) => {
      utils.measurement.getStructuralDefaults.invalidate({ projectId });
      utils.measurement.getBook.invalidate({ projectId });
      setSyncedRows(res.syncedRows ?? 0);
      setSaved(true);
      setError(null);
    },
    onError: (e) => {
      setError(e.message);
      setSaved(false);
    },
  });

  const [slabM, setSlabM] = useState(mmToM(DEFAULT_SLAB_THICKNESS_MM));
  const [beamM, setBeamM] = useState(mmToM(DEFAULT_BEAM_DEPTH_MM));
  const [lintelM, setLintelM] = useState(mmToM(DEFAULT_LINTEL_HEIGHT_MM));
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated || !defaultsQ.data) return;
    setSlabM(mmToM(defaultsQ.data.slabThicknessMm));
    setBeamM(mmToM(defaultsQ.data.beamDepthMm));
    setLintelM(mmToM(defaultsQ.data.lintelHeightMm));
    setHydrated(true);
  }, [defaultsQ.data, hydrated]);

  const deductions = useMemo(() => {
    return {
      slabThicknessMm: mToMm(slabM) ?? DEFAULT_SLAB_THICKNESS_MM,
      beamDepthMm: mToMm(beamM) ?? DEFAULT_BEAM_DEPTH_MM,
      lintelHeightMm: mToMm(lintelM) ?? DEFAULT_LINTEL_HEIGHT_MM,
    };
  }, [slabM, beamM, lintelM]);

  const previewLevel = levelsQ.data?.[0];
  const previewStorey = previewLevel?.storeyHeightMm ?? 3000;
  const columnH = deriveElementHeightMm({ storeyHeightMm: previewStorey, recipe: "COLUMN", deductions });
  const wallH = deriveElementHeightMm({ storeyHeightMm: previewStorey, recipe: "WALL", deductions });

  return (
    <Stack spacing={2.5} sx={{ mt: 2, maxWidth: 720 }}>
      <Stack spacing={1}>
        <Typography variant="h6" sx={{ m: 0 }}>
          Structural deductions
        </Typography>
        <p className="esti-label--secondary" style={{ margin: 0 }}>
          Project defaults for auto column / wall heights. Individual levels (and rows) can
          override beam depth and lintel when they vary — leave those blank to inherit these
          values.
          <br />
          <strong>Column</strong> = lvl − slab − beam &nbsp;·&nbsp;
          <strong>Wall</strong> = lvl − slab − beam − lintel
        </p>
      </Stack>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <TextField
          id="sd-slab"
          label="Slab thickness (m)"
          size="small"
          sx={{ width: 160 }}
          value={slabM}
          onChange={(e) => {
            setSlabM(e.target.value);
            setSaved(false);
          }}
        />
        <TextField
          id="sd-beam"
          label="Beam depth (m)"
          size="small"
          sx={{ width: 160 }}
          value={beamM}
          onChange={(e) => {
            setBeamM(e.target.value);
            setSaved(false);
          }}
        />
        <TextField
          id="sd-lintel"
          label="Lintel height (m)"
          size="small"
          sx={{ width: 160 }}
          value={lintelM}
          onChange={(e) => {
            setLintelM(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <p className="esti-label--secondary" style={{ margin: 0 }}>
        Preview on{" "}
        {previewLevel ? `${previewLevel.code} (${mmToM(previewStorey)} m)` : "3.000 m storey"}:
        column clear ≈ {mmToM(columnH ?? 0)} m · wall clear ≈ {mmToM(wallH ?? 0)} m
      </p>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          <AlertTitle>Could not save</AlertTitle>
          {error}
        </Alert>
      )}
      {saved && !error && (
        <Alert severity="success" onClose={() => setSaved(false)}>
          <AlertTitle>Deductions saved</AlertTitle>
          {`Linked measurement rows updated${
            syncedRows > 0 ? ` (${syncedRows} row${syncedRows === 1 ? "" : "s"})` : ""
          }. Column / wall clear heights now use these deductions.`}
        </Alert>
      )}

      <div>
        <Button
          variant="contained"
          disabled={save.isPending}
          onClick={() => {
            const slabThicknessMm = mToMm(slabM);
            const beamDepthMm = mToMm(beamM);
            const lintelHeightMm = mToMm(lintelM);
            if (slabThicknessMm == null || beamDepthMm == null || lintelHeightMm == null) {
              setError("Enter non-negative thicknesses in metres.");
              return;
            }
            save.mutate({ projectId, slabThicknessMm, beamDepthMm, lintelHeightMm });
          }}
        >
          {save.isPending ? "Saving…" : "Save deductions"}
        </Button>
      </div>
    </Stack>
  );
}
