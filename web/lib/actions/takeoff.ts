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
