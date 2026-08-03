import { Button, InlineNotification, Stack, TextInput } from "@carbon/react";
import {
  DEFAULT_BEAM_DEPTH_MM,
  DEFAULT_LINTEL_HEIGHT_MM,
  DEFAULT_SLAB_THICKNESS_MM,
  deriveElementHeightMm,
} from "@esti/contracts";
import { useEffect, useMemo, useState } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";
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
 * Wave 3 (Carbon).
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
    <CarbonScope>
      <Stack gap={5} style={{ marginTop: "1rem", maxWidth: 720 }}>
        <Stack gap={2}>
          <h3 className="cds--type-heading-03" style={{ margin: 0 }}>
            Structural deductions
          </h3>
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
          <div style={{ width: 160 }}>
            <TextInput
              id="sd-slab"
              labelText="Slab thickness (m)"
              size="sm"
              value={slabM}
              onChange={(e) => {
                setSlabM(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div style={{ width: 160 }}>
            <TextInput
              id="sd-beam"
              labelText="Beam depth (m)"
              size="sm"
              value={beamM}
              onChange={(e) => {
                setBeamM(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div style={{ width: 160 }}>
            <TextInput
              id="sd-lintel"
              labelText="Lintel height (m)"
              size="sm"
              value={lintelM}
              onChange={(e) => {
                setLintelM(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>

        <p className="esti-label--secondary" style={{ margin: 0 }}>
          Preview on{" "}
          {previewLevel ? `${previewLevel.code} (${mmToM(previewStorey)} m)` : "3.000 m storey"}:
          column clear ≈ {mmToM(columnH ?? 0)} m · wall clear ≈ {mmToM(wallH ?? 0)} m
        </p>

        {error && (
          <InlineNotification
            kind="error"
            lowContrast
            title="Could not save"
            subtitle={error}
            onCloseButtonClick={() => setError(null)}
          />
        )}
        {saved && !error && (
          <InlineNotification
            kind="success"
            lowContrast
            title="Deductions saved"
            subtitle={`Linked measurement rows updated${
              syncedRows > 0 ? ` (${syncedRows} row${syncedRows === 1 ? "" : "s"})` : ""
            }. Column / wall clear heights now use these deductions.`}
            onCloseButtonClick={() => setSaved(false)}
          />
        )}

        <div>
          <Button
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
    </CarbonScope>
  );
}
