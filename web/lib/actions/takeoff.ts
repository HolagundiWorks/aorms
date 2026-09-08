"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import {
  MasonryFields,
  PlasterFields,
  PaintingFields,
  OpeningFields,
  PccFields,
  EarthworkFields,
  SsmFields,
  WaterproofingFields,
  WaterproofingWorkMode,
  DpcFields,
  CopingFields,
  ScreedFields,
  VdfFields,
  SkirtingFields,
  ParapetFields,
  PlinthProtectionFields,
  FlooringFields,
  DeductRule,
  WallUnitType,
} from "../takeoff/formulas";

/**
 * Project take-off Server Actions — see web/lib/takeoff/formulas.ts and
 * migrations 0027_project_takeoff.sql / 0028_takeoff_more_categories.sql
 * for what this is (17 of AQC's ~18 measured-item categories — everything
 * but "shuttering", which AQC computes only from RCC members).
 */

export type TakeoffActionState = { error: string } | null;

function num(formData: FormData, name: string): number {
  const raw = String(formData.get(name) ?? "").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function str(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

function bool(formData: FormData, name: string): boolean {
  return str(formData, name) === "on" || str(formData, name).toLowerCase() === "true";
}

export async function createTakeoffItem(
  _prev: TakeoffActionState,
  formData: FormData,
): Promise<TakeoffActionState> {
  const projectId = str(formData, "projectId");
  const category = str(formData, "category");
  const mark = str(formData, "mark");
  const wallMark = str(formData, "wallMark") || null;
  const notes = str(formData, "notes") || null;

  if (!projectId) return { error: "Project is required." };
  if (!mark) return { error: "Mark is required." };

  let fields: Record<string, unknown>;

  switch (category) {
    case "MASONRY": {
      const parsed = MasonryFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        unitType: (str(formData, "unitType") || undefined) as WallUnitType | undefined,
        blockSize: str(formData, "blockSize") || undefined,
        mortarMix: str(formData, "mortarMix") || undefined,
      });
      if (!parsed.success) return { error: "Check the masonry dimensions — length/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "PLASTER": {
      const parsed = PlasterFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        mortarMix: str(formData, "mortarMix") || undefined,
        faces: num(formData, "faces") || undefined,
        addJambs: bool(formData, "addJambs"),
      });
      if (!parsed.success) return { error: "Check the plaster dimensions — length/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "PAINTING": {
      const parsed = PaintingFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm"),
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        paintType: str(formData, "paintType") || undefined,
        coats: num(formData, "coats") || undefined,
        faces: num(formData, "faces") || undefined,
        addJambs: bool(formData, "addJambs"),
      });
      if (!parsed.success) return { error: "Check the painting dimensions — length/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "DOOR":
    case "WINDOW": {
      const parsed = OpeningFields.safeParse({
        widthMm: num(formData, "widthMm"),
        heightMm: num(formData, "heightMm"),
        nos: num(formData, "nos") || undefined,
        deductFromWall: formData.has("deductFromWall") ? bool(formData, "deductFromWall") : undefined,
      });
      if (!parsed.success) return { error: "Check the opening dimensions — width/height must be positive numbers." };
      if (!wallMark) return { error: "Wall mark is required for a door/window (which wall it deducts from)." };
      fields = parsed.data;
      break;
    }
    case "PCC": {
      const parsed = PccFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        mix: str(formData, "mix") || undefined,
      });
      if (!parsed.success) return { error: "Check the PCC dimensions — length/breadth must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "EARTHWORK": {
      const parsed = EarthworkFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm"),
        depthMm: num(formData, "depthMm"),
        workType: str(formData, "workType") || undefined,
      });
      if (!parsed.success) return { error: "Check the earthwork dimensions — length/breadth/depth must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "SSM": {
      const parsed = SsmFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm"),
        heightMm: num(formData, "heightMm"),
        mortarMix: str(formData, "mortarMix") || undefined,
      });
      if (!parsed.success) return { error: "Check the SSM dimensions — length/breadth/height must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "WATERPROOFING": {
      const parsed = WaterproofingFields.safeParse({
        workMode: (str(formData, "workMode") || undefined) as WaterproofingWorkMode | undefined,
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm") || undefined,
        heightMm: num(formData, "heightMm") || undefined,
      });
      if (!parsed.success) return { error: "Check the waterproofing dimensions." };
      fields = parsed.data;
      break;
    }
    case "DPC": {
      const parsed = DpcFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        widthMm: num(formData, "widthMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        mortarMix: str(formData, "mortarMix") || undefined,
      });
      if (!parsed.success) return { error: "Check the DPC dimensions — length/width must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "COPING": {
      const parsed = CopingFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        widthMm: num(formData, "widthMm"),
        depthMm: num(formData, "depthMm"),
        concreteGrade: str(formData, "concreteGrade") || undefined,
      });
      if (!parsed.success) return { error: "Check the coping dimensions — length/width/depth must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "SCREED": {
      const parsed = ScreedFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        mix: str(formData, "mix") || undefined,
      });
      if (!parsed.success) return { error: "Check the screed dimensions — length/breadth must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "VDF": {
      const parsed = VdfFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm"),
        thicknessMm: num(formData, "thicknessMm") || undefined,
        concreteGrade: str(formData, "concreteGrade") || undefined,
      });
      if (!parsed.success) return { error: "Check the VDF dimensions — length/breadth must be positive numbers." };
      fields = parsed.data;
      break;
    }
    case "SKIRTING": {
      const parsed = SkirtingFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm") || undefined,
        finishType: str(formData, "finishType") || undefined,
      });
      if (!parsed.success) return { error: "Check the skirting dimensions — length must be a positive number." };
      fields = parsed.data;
      break;
    }
    case "PARAPET": {
      const parsed = ParapetFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        heightMm: num(formData, "heightMm") || undefined,
        thicknessMm: num(formData, "thicknessMm") || undefined,
        unitType: (str(formData, "unitType") || undefined) as WallUnitType | undefined,
        blockSize: str(formData, "blockSize") || undefined,
      });
      if (!parsed.success) return { error: "Check the parapet dimensions — length must be a positive number." };
      fields = parsed.data;
      break;
    }
    case "PLINTH_PROTECTION": {
      const parsed = PlinthProtectionFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm") || undefined,
        thicknessMm: num(formData, "thicknessMm") || undefined,
        finishType: str(formData, "finishType") || undefined,
      });
      if (!parsed.success) return { error: "Check the plinth protection dimensions — length must be a positive number." };
      fields = parsed.data;
      break;
    }
    case "FLOORING": {
      const parsed = FlooringFields.safeParse({
        lengthMm: num(formData, "lengthMm"),
        breadthMm: num(formData, "breadthMm"),
        deductRule: (str(formData, "deductRule") || undefined) as DeductRule | undefined,
        finishType: str(formData, "finishType") || undefined,
        surfaceKind: (str(formData, "surfaceKind") || undefined) as "Floor" | "Wall" | undefined,
      });
      if (!parsed.success) return { error: "Check the flooring dimensions — length/breadth must be positive numbers." };
      fields = parsed.data;
      break;
    }
    default:
      return { error: "Unknown category." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("takeoff_items").insert({
    project_id: projectId,
    category,
    mark,
    wall_mark: wallMark,
    fields,
    notes,
  });
  if (error) return { error: error.message };

  revalidatePath(`/takeoff/${projectId}`);
  return null;
}

export async function deleteTakeoffItem(itemId: string, projectId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("takeoff_items").delete().eq("id", itemId);
  revalidatePath(`/takeoff/${projectId}`);
}

/**
 * Derive Plaster + Painting rows from a Masonry wall — the one piece of
 * AQC's real architecture take-off's own migration (0027) explicitly did
 * NOT port: `BBSApp/Services/DerivationEngine.cs`'s link-rule cascade
 * (Masonry → Plastering → Painting, chained by a configurable Area-basis
 * multiplier over an abstract per-trade quantity graph). That shape
 * doesn't map cleanly onto this repo's actual take-off model, which
 * already computes each category's own wall-face area directly from its
 * own `lengthMm`/`heightMm` + a category-specific deduction rule (not a
 * source-quantity × factor) — so this ports the cascade's real *intent*
 * (don't re-enter the same wall three times) the way this repo's model
 * actually needs it: copy only the true shared geometry (length/height)
 * onto new PLASTER/PAINTING rows linked via `wall_mark`, and let each
 * target category's own Zod schema default everything else (thickness,
 * mortar mix, paint type, faces, deduct rule) — critically, NOT copying
 * `deductRule` from the masonry row, since IS 1200 masonry and IS 1200
 * plaster/paint use genuinely different deduction rules (masonry ignores
 * small openings under 0.1 m², finishes never do) and blindly copying it
 * would silently produce a wrong quantity.
 *
 * Idempotent per target category: skips (not duplicates) a PLASTER or
 * PAINTING row that already exists on this wall_mark — safe to click
 * again after adding a door/window, since openings link automatically via
 * `wall_mark` regardless of when the finish rows were created.
 */
export async function deriveWallFinishes(masonryItemId: string, projectId: string): Promise<{ error?: string; created?: string[] }> {
  const supabase = await createClient();

  const { data: masonry, error: fetchError } = await supabase
    .from("takeoff_items")
    .select("id, category, mark, fields")
    .eq("id", masonryItemId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!masonry || masonry.category !== "MASONRY") return { error: "Not a masonry wall." };

  const source = MasonryFields.safeParse(masonry.fields);
  if (!source.success) return { error: "This wall's own dimensions don't parse — fix it before deriving." };

  const { data: existing, error: existingError } = await supabase
    .from("takeoff_items")
    .select("category")
    .eq("project_id", projectId)
    .eq("wall_mark", masonry.mark)
    .in("category", ["PLASTER", "PAINTING"]);
  if (existingError) return { error: existingError.message };
  const already = new Set((existing ?? []).map((r) => r.category));

  const rows: { category: string; mark: string; wall_mark: string; fields: Record<string, unknown> }[] = [];
  if (!already.has("PLASTER")) {
    const parsed = PlasterFields.parse({ lengthMm: source.data.lengthMm, heightMm: source.data.heightMm });
    rows.push({ category: "PLASTER", mark: `${masonry.mark}-PL`, wall_mark: masonry.mark, fields: parsed });
  }
  if (!already.has("PAINTING")) {
    const parsed = PaintingFields.parse({ lengthMm: source.data.lengthMm, heightMm: source.data.heightMm });
    rows.push({ category: "PAINTING", mark: `${masonry.mark}-PT`, wall_mark: masonry.mark, fields: parsed });
  }

  if (rows.length === 0) return { created: [] };

  const { error: insertError } = await supabase.from("takeoff_items").insert(
    rows.map((r) => ({ project_id: projectId, category: r.category, mark: r.mark, wall_mark: r.wall_mark, fields: r.fields })),
  );
  if (insertError) return { error: insertError.message };

  revalidatePath(`/takeoff/${projectId}`);
  return { created: rows.map((r) => r.category) };
}
