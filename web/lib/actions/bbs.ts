"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../supabase/server";
import {
  BbsColumnInput,
  BbsBeamInput,
  BbsSlabInput,
  BbsFootingInput,
  BbsWallInput,
  BbsStairInput,
  type BbsElement,
} from "../bbs/formulas";
import { computeMember, type BbsMemberStored } from "../bbs/engine";

/**
 * Project BBS Server Actions — port of backend/src/modules/bbs/router.ts
 * (see web/lib/bbs/formulas.ts + engine.ts for the underlying pure-function
 * port). RLS (web/supabase/migrations/0019_project_bbs.sql) gates writes on
 * has_capability('write'), matching the old router's capabilityProcedure
 * ("write") — no separate app-level capability check needed here.
 */

export type BbsActionState = { error: string } | null;

function numberField(formData: FormData, name: string): number | undefined {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** Up to 3 dia/count pairs from fields named `${prefix}Dia1`/`${prefix}Count1`
 * etc. — a fixed-width alternative to a fully dynamic client-side list,
 * covering the common case (most members use 1–3 distinct bar diameters). */
function diaCountPairs(formData: FormData, prefix: string): { diaMm: number; count: number }[] {
  const out: { diaMm: number; count: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const dia = numberField(formData, `${prefix}Dia${i}`);
    const count = numberField(formData, `${prefix}Count${i}`);
    if (dia && count && count > 0) out.push({ diaMm: dia, count });
  }
  return out;
}

export async function createBbsSchedule(
  _prev: BbsActionState,
  formData: FormData,
): Promise<BbsActionState> {
  const projectId = String(formData.get("projectId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!projectId) return { error: "Project is required." };
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "bbs",
    p_default_prefix: "BBS",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("bbs_schedules")
    .insert({ ref: refData, project_id: projectId, title, notes, created_by_id: user?.id ?? null })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "bbs",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, projectId, title },
  });

  revalidatePath("/bbs");
  return null;
}

export async function updateBbsStatus(bbsId: string, status: "DRAFT" | "ISSUED"): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bbs_schedules")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bbsId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "bbs",
    p_entity_id: bbsId,
    p_action: "UPDATE",
    p_before: null,
    p_after: { status },
  });

  revalidatePath(`/bbs/${bbsId}`);
  return {};
}

export async function removeBbsSchedule(bbsId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("bbs_schedules").delete().eq("id", bbsId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "bbs",
    p_entity_id: bbsId,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath("/bbs");
  return {};
}

/** Shared insert path for all four addXMember() actions below — computes
 * the member's bar schedule and inserts the member row + its generated
 * bbs_items in one go, mirroring the old router's addMember + insertBarsForMember. */
async function insertMemberAndBars(
  bbsId: string,
  stored: BbsMemberStored,
): Promise<{ error: string } | { memberId: string }> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("bbs_members")
    .select("id", { count: "exact", head: true })
    .eq("bbs_id", bbsId);
  const sortOrder = count ?? 0;

  const computed = computeMember(stored, sortOrder);

  const { data: member, error: memberError } = await supabase
    .from("bbs_members")
    .insert({
      bbs_id: bbsId,
      element: stored.element,
      mark: computed.mark,
      input: stored.input,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (memberError) return { error: memberError.message };

  if (computed.bars.length > 0) {
    const { error: itemsError } = await supabase.from("bbs_items").insert(
      computed.bars.map((b) => ({
        bbs_id: bbsId,
        member_id: member.id,
        bar_mark: b.barMark,
        member: b.member,
        element: b.element,
        role: b.role,
        dia_mm: b.diaMm,
        no_of_members: b.noOfMembers,
        bars_per_member: b.barsPerMember,
        cutting_length_mm: b.cuttingLengthMm,
        weight_kg: b.weightKg,
        shape: b.shape,
      })),
    );
    if (itemsError) return { error: itemsError.message };
  }

  await supabase.rpc("write_audit", {
    p_entity: "bbs_member",
    p_entity_id: member.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { element: stored.element, mark: computed.mark, barCount: computed.bars.length },
  });

  revalidatePath(`/bbs/${bbsId}`);
  return { memberId: member.id };
}

export async function addColumnMember(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  if (!bbsId) return { error: "Missing schedule." };

  const parsed = BbsColumnInput.safeParse({
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    widthMm: numberField(formData, "widthMm"),
    depthMm: numberField(formData, "depthMm"),
    heightMm: numberField(formData, "heightMm"),
    coverMm: numberField(formData, "coverMm"),
    stirrupDiaMm: numberField(formData, "stirrupDiaMm"),
    spacingMm: numberField(formData, "spacingMm"),
    hookAngle: numberField(formData, "hookAngle"),
    tieType: String(formData.get("tieType") ?? "Closed"),
    mainBars: diaCountPairs(formData, "main"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid column input." };

  const result = await insertMemberAndBars(bbsId, { element: "COLUMN", input: parsed.data });
  if ("error" in result) return result;
  return null;
}

export async function addBeamMember(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  if (!bbsId) return { error: "Missing schedule." };

  const parsed = BbsBeamInput.safeParse({
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    clearSpanMm: numberField(formData, "clearSpanMm"),
    widthMm: numberField(formData, "widthMm"),
    depthMm: numberField(formData, "depthMm"),
    coverMm: numberField(formData, "coverMm"),
    concreteGrade: String(formData.get("concreteGrade") ?? "M20"),
    steelGrade: String(formData.get("steelGrade") ?? "Fe415"),
    stirrupDiaMm: numberField(formData, "stirrupDiaMm"),
    spacingSupportMm: numberField(formData, "spacingSupportMm"),
    spacingMiddleMm: numberField(formData, "spacingMiddleMm"),
    stirrupLegs: numberField(formData, "stirrupLegs"),
    hookAngle: numberField(formData, "hookAngle"),
    topBarType: String(formData.get("topBarType") ?? "Full Span"),
    topBars: diaCountPairs(formData, "top"),
    bottomBars: diaCountPairs(formData, "bottom"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid beam input." };

  const result = await insertMemberAndBars(bbsId, { element: "BEAM", input: parsed.data });
  if ("error" in result) return result;
  return null;
}

export async function addSlabMember(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  if (!bbsId) return { error: "Missing schedule." };

  const parsed = BbsSlabInput.safeParse({
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    spanXMm: numberField(formData, "spanXMm"),
    spanYMm: numberField(formData, "spanYMm"),
    thicknessMm: numberField(formData, "thicknessMm"),
    coverMm: numberField(formData, "coverMm"),
    concreteGrade: String(formData.get("concreteGrade") ?? "M20"),
    steelGrade: String(formData.get("steelGrade") ?? "Fe415"),
    slabType: String(formData.get("slabType") ?? "One-Way"),
    diaXMm: numberField(formData, "diaXMm"),
    spacingXMm: numberField(formData, "spacingXMm"),
    diaYMm: numberField(formData, "diaYMm"),
    spacingYMm: numberField(formData, "spacingYMm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid slab input." };

  const result = await insertMemberAndBars(bbsId, { element: "SLAB", input: parsed.data });
  if ("error" in result) return result;
  return null;
}

export async function addFootingMember(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  if (!bbsId) return { error: "Missing schedule." };

  const parsed = BbsFootingInput.safeParse({
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    lengthMm: numberField(formData, "lengthMm"),
    widthMm: numberField(formData, "widthMm"),
    columnLengthMm: numberField(formData, "columnLengthMm"),
    columnWidthMm: numberField(formData, "columnWidthMm"),
    depthMm: numberField(formData, "depthMm"),
    coverMm: numberField(formData, "coverMm"),
    concreteGrade: String(formData.get("concreteGrade") ?? "M20"),
    steelGrade: String(formData.get("steelGrade") ?? "Fe415"),
    diaLMm: numberField(formData, "diaLMm"),
    spacingLMm: numberField(formData, "spacingLMm"),
    diaBMm: numberField(formData, "diaBMm"),
    spacingBMm: numberField(formData, "spacingBMm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid footing input." };

  const result = await insertMemberAndBars(bbsId, { element: "FOOTING", input: parsed.data });
  if ("error" in result) return result;
  return null;
}

export async function addWallMember(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  if (!bbsId) return { error: "Missing schedule." };

  const parsed = BbsWallInput.safeParse({
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    wallLengthMm: numberField(formData, "wallLengthMm"),
    stemHeightMm: numberField(formData, "stemHeightMm"),
    stemThicknessMm: numberField(formData, "stemThicknessMm"),
    heelMm: numberField(formData, "heelMm"),
    toeMm: numberField(formData, "toeMm"),
    baseThicknessMm: numberField(formData, "baseThicknessMm"),
    coverMm: numberField(formData, "coverMm"),
    concreteGrade: String(formData.get("concreteGrade") ?? "M20"),
    steelGrade: String(formData.get("steelGrade") ?? "Fe415"),
    tensionFace: String(formData.get("tensionFace") ?? "Front"),
    stemVDiaMm: numberField(formData, "stemVDiaMm"),
    stemVSpacingMm: numberField(formData, "stemVSpacingMm"),
    stemVBackDiaMm: numberField(formData, "stemVBackDiaMm"),
    stemVBackSpacingMm: numberField(formData, "stemVBackSpacingMm"),
    stemHDiaMm: numberField(formData, "stemHDiaMm"),
    stemHSpacingMm: numberField(formData, "stemHSpacingMm"),
    baseLDiaMm: numberField(formData, "baseLDiaMm"),
    baseLSpacingMm: numberField(formData, "baseLSpacingMm"),
    baseBDiaMm: numberField(formData, "baseBDiaMm"),
    baseBSpacingMm: numberField(formData, "baseBSpacingMm"),
    linkDiaMm: numberField(formData, "linkDiaMm"),
    linkSpacingMm: numberField(formData, "linkSpacingMm"),
    linkLegs: numberField(formData, "linkLegs"),
    hookAngle: numberField(formData, "hookAngle"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid wall input." };

  const result = await insertMemberAndBars(bbsId, { element: "WALL", input: parsed.data });
  if ("error" in result) return result;
  return null;
}

export async function addStairMember(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  if (!bbsId) return { error: "Missing schedule." };

  const parsed = BbsStairInput.safeParse({
    mark: String(formData.get("mark") ?? "").trim() || undefined,
    nRisers: numberField(formData, "nRisers"),
    nFlights: numberField(formData, "nFlights"),
    goingMm: numberField(formData, "goingMm"),
    riserMm: numberField(formData, "riserMm"),
    waistThicknessMm: numberField(formData, "waistThicknessMm"),
    flightWidthMm: numberField(formData, "flightWidthMm"),
    coverMm: numberField(formData, "coverMm"),
    landingLengthMm: numberField(formData, "landingLengthMm"),
    landingWidthMm: numberField(formData, "landingWidthMm"),
    concreteGrade: String(formData.get("concreteGrade") ?? "M20"),
    steelGrade: String(formData.get("steelGrade") ?? "Fe415"),
    mainDiaMm: numberField(formData, "mainDiaMm"),
    mainSpacingMm: numberField(formData, "mainSpacingMm"),
    distDiaMm: numberField(formData, "distDiaMm"),
    distSpacingMm: numberField(formData, "distSpacingMm"),
    landingDiaMm: numberField(formData, "landingDiaMm"),
    landingSpacingMm: numberField(formData, "landingSpacingMm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid stair input." };

  const result = await insertMemberAndBars(bbsId, { element: "STAIR", input: parsed.data });
  if ("error" in result) return result;
  return null;
}

export type BbsElementType = BbsElement;

export async function removeBbsMember(memberId: string, bbsId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("bbs_members").delete().eq("id", memberId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "bbs_member",
    p_entity_id: memberId,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/bbs/${bbsId}`);
  return {};
}

export async function regenerateBbsMember(memberId: string, bbsId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: member, error: memberError } = await supabase
    .from("bbs_members")
    .select("id, element, input")
    .eq("id", memberId)
    .maybeSingle();
  if (memberError) return { error: memberError.message };
  if (!member) return { error: "Member not found." };

  const stored = { element: member.element, input: member.input } as BbsMemberStored;
  const computed = computeMember(stored);

  const { error: deleteError } = await supabase
    .from("bbs_items")
    .delete()
    .eq("bbs_id", bbsId)
    .eq("member_id", memberId);
  if (deleteError) return { error: deleteError.message };

  if (computed.bars.length > 0) {
    const { error: itemsError } = await supabase.from("bbs_items").insert(
      computed.bars.map((b) => ({
        bbs_id: bbsId,
        member_id: memberId,
        bar_mark: b.barMark,
        member: b.member,
        element: b.element,
        role: b.role,
        dia_mm: b.diaMm,
        no_of_members: b.noOfMembers,
        bars_per_member: b.barsPerMember,
        cutting_length_mm: b.cuttingLengthMm,
        weight_kg: b.weightKg,
        shape: b.shape,
      })),
    );
    if (itemsError) return { error: itemsError.message };
  }

  const { error: updateError } = await supabase
    .from("bbs_members")
    .update({ mark: computed.mark, updated_at: new Date().toISOString() })
    .eq("id", memberId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/bbs/${bbsId}`);
  return {};
}

export async function addManualBbsItem(_prev: BbsActionState, formData: FormData): Promise<BbsActionState> {
  const bbsId = String(formData.get("bbsId") ?? "").trim();
  const barMark = String(formData.get("barMark") ?? "").trim();
  const diaMm = numberField(formData, "diaMm");
  const noOfMembers = numberField(formData, "noOfMembers") ?? 1;
  const barsPerMember = numberField(formData, "barsPerMember") ?? 1;
  const cuttingLengthMm = numberField(formData, "cuttingLengthMm");
  const floor = String(formData.get("floor") ?? "").trim() || null;
  const shape = String(formData.get("shape") ?? "").trim() || null;

  if (!bbsId) return { error: "Missing schedule." };
  if (!barMark) return { error: "Bar mark is required." };
  if (!diaMm) return { error: "Diameter is required." };
  if (!cuttingLengthMm) return { error: "Cutting length is required." };

  const weightKg = round2(
    (cuttingLengthMm / 1000) * noOfMembers * barsPerMember * ((diaMm * diaMm) / 162),
  );

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("bbs_items")
    .insert({
      bbs_id: bbsId,
      bar_mark: barMark,
      dia_mm: diaMm,
      no_of_members: noOfMembers,
      bars_per_member: barsPerMember,
      cutting_length_mm: cuttingLengthMm,
      weight_kg: weightKg,
      floor,
      shape,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "bbs_item",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { barMark, diaMm, cuttingLengthMm },
  });

  revalidatePath(`/bbs/${bbsId}`);
  return null;
}

export async function removeBbsItem(itemId: string, bbsId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("bbs_items").delete().eq("id", itemId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "bbs_item",
    p_entity_id: itemId,
    p_action: "DELETE",
    p_before: null,
    p_after: null,
  });

  revalidatePath(`/bbs/${bbsId}`);
  return {};
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
