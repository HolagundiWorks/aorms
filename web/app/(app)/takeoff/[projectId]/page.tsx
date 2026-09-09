import { notFound } from "next/navigation";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tile } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewTakeoffItemForms } from "../../../../components/aorms/NewTakeoffItemForms";
import { DeleteTakeoffItemButton } from "../../../../components/aorms/DeleteTakeoffItemButton";
import { SendTakeoffToEstimateButton } from "../../../../components/aorms/SendTakeoffToEstimateButton";
import { DeriveWallFinishesButton } from "../../../../components/aorms/DeriveWallFinishesButton";
import { PageHeader } from "../../../../components/aorms/PageHeader";
import {
  computeMasonry,
  computePlaster,
  computePainting,
  computeOpeningAreaM2,
  computeFlooring,
  computePcc,
  computeEarthwork,
  computeSsm,
  computeWaterproofing,
  computeDpc,
  computeCoping,
  computeScreed,
  computeVdf,
  computeSkirting,
  computeParapet,
  computePlinthProtection,
  MasonryFields,
  PlasterFields,
  PaintingFields,
  OpeningFields,
  FlooringFields,
  PccFields,
  EarthworkFields,
  SsmFields,
  WaterproofingFields,
  DpcFields,
  CopingFields,
  ScreedFields,
  VdfFields,
  SkirtingFields,
  ParapetFields,
  PlinthProtectionFields,
  type LinkedOpening,
} from "../../../../lib/takeoff/formulas";

type TakeoffRow = {
  id: string;
  category: string;
  mark: string;
  wall_mark: string | null;
  fields: Record<string, unknown>;
  notes: string | null;
};

function fmt(n: number): string {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 3 });
}

/**
 * Project take-off detail — masonry/plaster/painting quantities computed
 * live from stored dimension fields + linked door/window openings on the
 * same wall_mark, never cached. See lib/takeoff/formulas.ts's docstring for
 * the AQC port this is based on.
 */
export default async function TakeoffProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();

  const [{ data: project, error: projError }, { data: rows, error: itemsError }, { data: estimates }] = await Promise.all([
    supabase.from("project_offices").select("id, title, ref").eq("id", projectId).maybeSingle(),
    supabase
      .from("takeoff_items")
      .select("id, category, mark, wall_mark, fields, notes")
      .eq("project_id", projectId)
      .order("mark"),
    supabase.from("estimates").select("id, ref, title").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  if (projError) {
    return (
      <Grid>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load project: {projError.message}
          </p>
        </Column>
      </Grid>
    );
  }
  if (!project) notFound();

  const items = (rows ?? []) as TakeoffRow[];
  const openings = items.filter((r) => r.category === "DOOR" || r.category === "WINDOW");

  function linkedOpenings(wallMark: string | null): LinkedOpening[] {
    if (!wallMark) return [];
    return openings
      .filter((o) => (o.wall_mark ?? "").toLowerCase() === wallMark.toLowerCase())
      .map((o) => {
        const f = OpeningFields.safeParse(o.fields);
        if (!f.success) return null;
        return {
          widthMm: f.data.widthMm,
          heightMm: f.data.heightMm,
          nos: f.data.nos,
          deductFromWall: f.data.deductFromWall,
        };
      })
      .filter((x): x is LinkedOpening => x !== null);
  }

  let totalCementBags = 0;
  let totalSandM3 = 0;
  let totalAggregateM3 = 0;
  let totalBricks = 0;

  const masonryRows = items
    .filter((r) => r.category === "MASONRY")
    .map((r) => {
      const parsed = MasonryFields.safeParse(r.fields);
      if (!parsed.success) return { row: r, error: "Invalid stored fields" as const };
      const result = computeMasonry(parsed.data, linkedOpenings(r.mark));
      totalCementBags += result.cementBags;
      totalSandM3 += result.sandM3;
      totalAggregateM3 += result.aggregateM3;
      totalBricks += result.bricks;
      return { row: r, fields: parsed.data, result };
    });

  const plasterRows = items
    .filter((r) => r.category === "PLASTER")
    .map((r) => {
      const parsed = PlasterFields.safeParse(r.fields);
      if (!parsed.success) return { row: r, error: "Invalid stored fields" as const };
      const result = computePlaster(parsed.data, linkedOpenings(r.wall_mark));
      totalCementBags += result.cementBags;
      totalSandM3 += result.sandM3;
      totalAggregateM3 += result.aggregateM3;
      return { row: r, fields: parsed.data, result };
    });

  const paintingRows = items
    .filter((r) => r.category === "PAINTING")
    .map((r) => {
      const parsed = PaintingFields.safeParse(r.fields);
      if (!parsed.success) return { row: r, error: "Invalid stored fields" as const };
      const result = computePainting(parsed.data, linkedOpenings(r.wall_mark));
      return { row: r, fields: parsed.data, result };
    });

  const doorRows = items
    .filter((r) => r.category === "DOOR")
    .map((r) => {
      const parsed = OpeningFields.safeParse(r.fields);
      if (!parsed.success) return { row: r, error: "Invalid stored fields" as const };
      return { row: r, fields: parsed.data, areaM2: computeOpeningAreaM2(parsed.data) };
    });

  const windowRows = items
    .filter((r) => r.category === "WINDOW")
    .map((r) => {
      const parsed = OpeningFields.safeParse(r.fields);
      if (!parsed.success) return { row: r, error: "Invalid stored fields" as const };
      return { row: r, fields: parsed.data, areaM2: computeOpeningAreaM2(parsed.data) };
    });

  // The other ~12 "simple" categories (see formulas.ts) — one normalized
  // display row per category rather than 12 near-duplicate table blocks.
  type OtherRow = { id: string; category: string; mark: string; wallMark: string | null; dims: string; unit: string; qty: number; materials: string; note: string };
  const otherRows: OtherRow[] = [];

  for (const r of items) {
    if (r.category === "FLOORING") {
      const parsed = FlooringFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeFlooring(parsed.data, linkedOpenings(r.wall_mark));
      otherRows.push({
        id: r.id, category: "Flooring", mark: r.mark, wallMark: r.wall_mark,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} mm`, unit: "m²", qty: result.areaM2,
        materials: "—", note: `${parsed.data.finishType} · ${result.note}`,
      });
    } else if (r.category === "PCC") {
      const parsed = PccFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computePcc(parsed.data);
      totalCementBags += result.cementBags; totalSandM3 += result.sandM3; totalAggregateM3 += result.aggregateM3;
      otherRows.push({
        id: r.id, category: "PCC", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} × ${parsed.data.thicknessMm} mm`, unit: result.unit, qty: result.qty,
        materials: `${fmt(result.cementBags)} bags / ${fmt(result.sandM3)} m³ / ${fmt(result.aggregateM3)} m³`, note: parsed.data.mix,
      });
    } else if (r.category === "EARTHWORK") {
      const parsed = EarthworkFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeEarthwork(parsed.data);
      otherRows.push({
        id: r.id, category: "Earthwork", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} × ${parsed.data.depthMm} mm`, unit: result.unit, qty: result.qty,
        materials: "—", note: parsed.data.workType,
      });
    } else if (r.category === "SSM") {
      const parsed = SsmFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeSsm(parsed.data);
      totalCementBags += result.cementBags; totalSandM3 += result.sandM3; totalAggregateM3 += result.aggregateM3;
      otherRows.push({
        id: r.id, category: "SSM", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} × ${parsed.data.heightMm} mm`, unit: result.unit, qty: result.qty,
        materials: `${fmt(result.cementBags)} bags / ${fmt(result.sandM3)} m³`, note: parsed.data.mortarMix,
      });
    } else if (r.category === "WATERPROOFING") {
      const parsed = WaterproofingFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeWaterproofing(parsed.data);
      otherRows.push({
        id: r.id, category: "Waterproofing", mark: r.mark, wallMark: null,
        dims: parsed.data.workMode === "Periphery" ? `${parsed.data.lengthMm} × ${parsed.data.heightMm} mm` : `${parsed.data.lengthMm} × ${parsed.data.breadthMm} mm`,
        unit: result.unit, qty: result.qty, materials: "—", note: parsed.data.workMode,
      });
    } else if (r.category === "DPC") {
      const parsed = DpcFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeDpc(parsed.data);
      otherRows.push({
        id: r.id, category: "DPC", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.widthMm} × ${parsed.data.thicknessMm} mm`, unit: result.unit, qty: result.qty,
        materials: "—", note: `vol ${fmt(result.volumeM3)} m³`,
      });
    } else if (r.category === "COPING") {
      const parsed = CopingFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeCoping(parsed.data);
      otherRows.push({
        id: r.id, category: "Coping", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.widthMm} × ${parsed.data.depthMm} mm`, unit: result.unit, qty: result.qty,
        materials: "—", note: `${parsed.data.concreteGrade} · vol ${fmt(result.volumeM3)} m³`,
      });
    } else if (r.category === "SCREED") {
      const parsed = ScreedFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeScreed(parsed.data);
      totalCementBags += result.cementBags; totalSandM3 += result.sandM3; totalAggregateM3 += result.aggregateM3;
      otherRows.push({
        id: r.id, category: "Screed", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} × ${parsed.data.thicknessMm} mm`, unit: result.unit, qty: result.qty,
        materials: `${fmt(result.cementBags)} bags / ${fmt(result.sandM3)} m³ / ${fmt(result.aggregateM3)} m³`, note: parsed.data.mix,
      });
    } else if (r.category === "VDF") {
      const parsed = VdfFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeVdf(parsed.data);
      otherRows.push({
        id: r.id, category: "VDF", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} × ${parsed.data.thicknessMm} mm`, unit: result.unit, qty: result.qty,
        materials: "—", note: `${parsed.data.concreteGrade} · vol ${fmt(result.volumeM3)} m³`,
      });
    } else if (r.category === "SKIRTING") {
      const parsed = SkirtingFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeSkirting(parsed.data);
      otherRows.push({
        id: r.id, category: "Skirting", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.heightMm} mm`, unit: result.unit, qty: result.qty,
        materials: "—", note: parsed.data.finishType,
      });
    } else if (r.category === "PARAPET") {
      const parsed = ParapetFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computeParapet(parsed.data);
      totalBricks += result.bricks;
      otherRows.push({
        id: r.id, category: "Parapet", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.heightMm} × ${parsed.data.thicknessMm} mm`, unit: result.unit, qty: result.qty,
        materials: [
          result.bricks > 0 ? `${fmt(result.bricks)} bricks` : null,
          result.accBlocks > 0 ? `${fmt(result.accBlocks)} ACC` : null,
          result.cementBlocks > 0 ? `${fmt(result.cementBlocks)} cem. blk` : null,
        ].filter(Boolean).join(", ") || "—",
        note: `face ${fmt(result.areaM2)} m²`,
      });
    } else if (r.category === "PLINTH_PROTECTION") {
      const parsed = PlinthProtectionFields.safeParse(r.fields);
      if (!parsed.success) continue;
      const result = computePlinthProtection(parsed.data);
      otherRows.push({
        id: r.id, category: "Plinth protection", mark: r.mark, wallMark: null,
        dims: `${parsed.data.lengthMm} × ${parsed.data.breadthMm} × ${parsed.data.thicknessMm} mm`, unit: result.unit, qty: result.qty,
        materials: "—", note: parsed.data.finishType,
      });
    }
  }

  return (
    <Grid>
      <Column sm={4} md={8} lg={16}>
        <PageHeader eyebrow={project.ref} eyebrowMono title={`${project.title} — Take-off`} />

        <NewTakeoffItemForms projectId={project.id} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)", marginTop: "1.5rem" }}>
            Couldn&apos;t load take-off items: {itemsError.message}
          </p>
        ) : (
          <>
            <h2 className="cds--type-heading-02" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
              Masonry walls
            </h2>
            <Table aria-label="Masonry walls" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>L × H (mm)</TableHeader>
                  <TableHeader>Thk (mm)</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Net qty</TableHeader>
                  <TableHeader>Bricks / blocks</TableHeader>
                  <TableHeader>Cement / sand / agg</TableHeader>
                  <TableHeader>Note</TableHeader>
                  <TableHeader>Derive finishes</TableHeader>
                  <TableHeader>Send to Estimate</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {masonryRows.map(({ row, fields, result, error }) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.mark}</TableCell>
                    <TableCell>{fields ? `${fields.lengthMm} × ${fields.heightMm}` : "—"}</TableCell>
                    <TableCell>{fields?.thicknessMm ?? "—"}</TableCell>
                    <TableCell>{result?.unit ?? "—"}</TableCell>
                    <TableCell>{result ? fmt(result.qty) : "—"}</TableCell>
                    <TableCell>
                      {result
                        ? [
                            result.bricks > 0 ? `${fmt(result.bricks)} bricks` : null,
                            result.accBlocks > 0 ? `${fmt(result.accBlocks)} ACC` : null,
                            result.cementBlocks > 0 ? `${fmt(result.cementBlocks)} cem. blk` : null,
                          ]
                            .filter(Boolean)
                            .join(", ") || "—"
                        : (error ?? "—")}
                    </TableCell>
                    <TableCell>
                      {result
                        ? `${fmt(result.cementBags)} bags / ${fmt(result.sandM3)} m³ / ${fmt(result.aggregateM3)} m³`
                        : "—"}
                    </TableCell>
                    <TableCell>{result?.note ?? "—"}</TableCell>
                    <TableCell>
                      <DeriveWallFinishesButton takeoffItemId={row.id} projectId={project.id} />
                    </TableCell>
                    <TableCell>
                      <SendTakeoffToEstimateButton takeoffItemId={row.id} projectId={project.id} estimates={estimates ?? []} />
                    </TableCell>
                    <TableCell>
                      <DeleteTakeoffItemButton itemId={row.id} projectId={project.id} />
                    </TableCell>
                  </TableRow>
                ))}
                {masonryRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No masonry walls yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <h2 className="cds--type-heading-02" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
              Plaster
            </h2>
            <Table aria-label="Plaster" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Wall</TableHeader>
                  <TableHeader>L × H (mm)</TableHeader>
                  <TableHeader>Net area (m²)</TableHeader>
                  <TableHeader>Cement / sand / agg</TableHeader>
                  <TableHeader>Note</TableHeader>
                  <TableHeader>Send to Estimate</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {plasterRows.map(({ row, fields, result, error }) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.mark}</TableCell>
                    <TableCell>{row.wall_mark ?? "—"}</TableCell>
                    <TableCell>{fields ? `${fields.lengthMm} × ${fields.heightMm}` : "—"}</TableCell>
                    <TableCell>{result ? fmt(result.areaM2) : (error ?? "—")}</TableCell>
                    <TableCell>
                      {result
                        ? `${fmt(result.cementBags)} bags / ${fmt(result.sandM3)} m³ / ${fmt(result.aggregateM3)} m³`
                        : "—"}
                    </TableCell>
                    <TableCell>{result?.note ?? "—"}</TableCell>
                    <TableCell>
                      <SendTakeoffToEstimateButton takeoffItemId={row.id} projectId={project.id} estimates={estimates ?? []} />
                    </TableCell>
                    <TableCell>
                      <DeleteTakeoffItemButton itemId={row.id} projectId={project.id} />
                    </TableCell>
                  </TableRow>
                ))}
                {plasterRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No plaster items yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <h2 className="cds--type-heading-02" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
              Painting
            </h2>
            <Table aria-label="Painting" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Wall</TableHeader>
                  <TableHeader>L × H (mm)</TableHeader>
                  <TableHeader>Net area (m²)</TableHeader>
                  <TableHeader>Type / coats</TableHeader>
                  <TableHeader>Note</TableHeader>
                  <TableHeader>Send to Estimate</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {paintingRows.map(({ row, fields, result, error }) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.mark}</TableCell>
                    <TableCell>{row.wall_mark ?? "—"}</TableCell>
                    <TableCell>{fields ? `${fields.lengthMm} × ${fields.heightMm}` : "—"}</TableCell>
                    <TableCell>{result ? fmt(result.areaM2) : (error ?? "—")}</TableCell>
                    <TableCell>{fields ? `${fields.paintType} · ${fields.coats} coats` : "—"}</TableCell>
                    <TableCell>{result?.note ?? "—"}</TableCell>
                    <TableCell>
                      <SendTakeoffToEstimateButton takeoffItemId={row.id} projectId={project.id} estimates={estimates ?? []} />
                    </TableCell>
                    <TableCell>
                      <DeleteTakeoffItemButton itemId={row.id} projectId={project.id} />
                    </TableCell>
                  </TableRow>
                ))}
                {paintingRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No painting items yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <h2 className="cds--type-heading-02" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
              Doors &amp; windows
            </h2>
            <Table aria-label="Doors and windows" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Kind</TableHeader>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Wall</TableHeader>
                  <TableHeader>W × H (mm)</TableHeader>
                  <TableHeader>Nos</TableHeader>
                  <TableHeader>Area (m²)</TableHeader>
                  <TableHeader>Deducts?</TableHeader>
                  <TableHeader>Send to Estimate</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {[...doorRows.map((r) => ({ ...r, kind: "Door" })), ...windowRows.map((r) => ({ ...r, kind: "Window" }))].map(
                  ({ row, fields, areaM2, error, kind }) => (
                    <TableRow key={row.id}>
                      <TableCell>{kind}</TableCell>
                      <TableCell>{row.mark}</TableCell>
                      <TableCell>{row.wall_mark ?? "—"}</TableCell>
                      <TableCell>{fields ? `${fields.widthMm} × ${fields.heightMm}` : "—"}</TableCell>
                      <TableCell>{fields?.nos ?? "—"}</TableCell>
                      <TableCell>{areaM2 !== undefined ? fmt(areaM2) : (error ?? "—")}</TableCell>
                      <TableCell>{fields?.deductFromWall ? "Yes" : "No"}</TableCell>
                      <TableCell>
                        <SendTakeoffToEstimateButton takeoffItemId={row.id} projectId={project.id} estimates={estimates ?? []} />
                      </TableCell>
                      <TableCell>
                        <DeleteTakeoffItemButton itemId={row.id} projectId={project.id} />
                      </TableCell>
                    </TableRow>
                  ),
                )}
                {doorRows.length === 0 && windowRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No doors or windows yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <h2 className="cds--type-heading-02" style={{ marginTop: "2rem", marginBottom: "1rem" }}>
              Other measured items
            </h2>
            <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "1rem" }}>
              PCC, earthwork, size-stone masonry, waterproofing, DPC, coping, screed, VDF, skirting,
              parapet, plinth protection, and flooring — one table across all 12 (see the tabs above
              to add one).
            </p>
            <Table aria-label="Other measured items" className="aorms-table-spaced">
              <TableHead>
                <TableRow>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Mark</TableHeader>
                  <TableHeader>Wall</TableHeader>
                  <TableHeader>Dimensions</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Qty</TableHeader>
                  <TableHeader>Materials</TableHeader>
                  <TableHeader>Note</TableHeader>
                  <TableHeader>Send to Estimate</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <TableBody>
                {otherRows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.category}</TableCell>
                    <TableCell>{o.mark}</TableCell>
                    <TableCell>{o.wallMark ?? "—"}</TableCell>
                    <TableCell>{o.dims}</TableCell>
                    <TableCell>{o.unit}</TableCell>
                    <TableCell>{fmt(o.qty)}</TableCell>
                    <TableCell>{o.materials}</TableCell>
                    <TableCell>{o.note}</TableCell>
                    <TableCell>
                      <SendTakeoffToEstimateButton takeoffItemId={o.id} projectId={project.id} estimates={estimates ?? []} />
                    </TableCell>
                    <TableCell>
                      <DeleteTakeoffItemButton itemId={o.id} projectId={project.id} />
                    </TableCell>
                  </TableRow>
                ))}
                {otherRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                        No other measured items yet.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Tile style={{ marginTop: "2rem", maxWidth: "28rem" }}>
              <h3 className="cds--type-heading-compact-02" style={{ marginBottom: "0.75rem" }}>
                Materials — every category with a cement/brick yield, combined
              </h3>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Bricks</span>
                <span className="cds--type-body-01">{fmt(totalBricks)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Cement (50 kg bags)</span>
                <span className="cds--type-body-01">{fmt(totalCementBags)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Sand (m³)</span>
                <span className="cds--type-body-01">{fmt(totalSandM3)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
                <span className="cds--type-body-01">Aggregate (m³)</span>
                <span className="cds--type-body-01">{fmt(totalAggregateM3)}</span>
              </div>
              <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.5rem" }}>
                Quantity take-off only — no rates. Use &quot;Send to Estimate&quot; on any row above
                to create a priced-at-₹0 line on an existing estimate; price it there afterward,
                same as any other line.
              </p>
            </Tile>
          </>
        )}
      </Column>
    </Grid>
  );
}
