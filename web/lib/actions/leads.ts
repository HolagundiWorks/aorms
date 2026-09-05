"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { LEAD_TERMINAL_STATUSES, type LeadStatus } from "../project-os";

type ActionState = { error: string } | null;

export async function createLead(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const clientName = String(formData.get("clientName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const leadSource = String(formData.get("leadSource") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim() || null;
  const siteLocation = String(formData.get("siteLocation") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!clientName) return { error: "Client name is required." };
  if (!leadSource) return { error: "Lead source is required." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "lead",
    p_default_prefix: "LDR",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert({
      ref: refData,
      client_name: clientName,
      phone,
      email,
      lead_source: leadSource,
      project_type: projectType,
      site_location: siteLocation,
      city,
      notes,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "lead",
    p_entity_id: inserted.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, clientName, leadSource },
  });

  revalidatePath("/leads");
  return null;
}

export async function setLeadStatus(leadId: string, status: LeadStatus): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: before } = await supabase.from("leads").select("status, converted_project_id").eq("id", leadId).maybeSingle();
  if (before?.converted_project_id) return { error: "A converted lead cannot change status." };

  const { error } = await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", leadId);
  if (error) return { error: error.message };

  await supabase.rpc("write_audit", {
    p_entity: "lead",
    p_entity_id: leadId,
    p_action: "STATUS",
    p_before: { status: before?.status },
    p_after: { status },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  return {};
}

export type ConvertActionState = { error: string } | null;

/**
 * Port of leads.convert (backend/src/modules/projectos/leads.ts) — the
 * conflict-of-interest gate is ported verbatim (a real COA Regulations 1989
 * compliance check, not a UI nicety: it's re-checked here server-side
 * regardless of what the client sends). assertQuota/assertNotFixedPlan are
 * DROPPED per the established Phase 2 tenancy decision (no plan tiers in a
 * single-tenant deployment).
 *
 * Done as sequential Supabase calls, not a single Postgres transaction —
 * matching the pattern this whole session's Server Actions already use for
 * every other multi-step write (e.g. RA bill lines rolling into gross_paise),
 * not a one-off exception. A real transaction would be safer against partial
 * failure (an orphan client row if project creation fails); noted, not fixed.
 */
export async function convertLead(_prev: ConvertActionState, formData: FormData): Promise<ConvertActionState> {
  const leadId = String(formData.get("leadId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim() || null;
  const projectTitle = String(formData.get("projectTitle") ?? "").trim();
  const projectType = String(formData.get("projectType") ?? "").trim();
  const workType = String(formData.get("workType") ?? "ARCHITECTURE");
  const conflictCheckDone = formData.get("conflictCheckDone") === "on";
  const conflictCheckNotes = String(formData.get("conflictCheckNotes") ?? "").trim() || null;

  if (!leadId) return { error: "Missing lead." };
  if (!projectTitle) return { error: "Project title is required." };
  if (!projectType) return { error: "Project type is required." };
  if (!conflictCheckDone) {
    return { error: "Confirm the conflict-of-interest check before converting this lead." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", leadId).maybeSingle();
  if (leadError) return { error: leadError.message };
  if (!lead) return { error: "Lead not found." };
  if (lead.converted_project_id) return { error: "Lead is already converted." };
  if (LEAD_TERMINAL_STATUSES.has(lead.status as LeadStatus) && lead.status !== "QUALIFIED") {
    return { error: `A ${lead.status} lead cannot be converted.` };
  }

  // Resolve the client — reuse an existing one or mint from lead contact.
  let resolvedClientId = clientId;
  if (!resolvedClientId) {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({ name: lead.client_name, kind: "INDIVIDUAL", email: lead.email, phone: lead.phone, city: lead.city })
      .select("id")
      .single();
    if (clientError) return { error: clientError.message };
    resolvedClientId = newClient.id;
  }

  const { data: refData, error: refError } = await supabase.rpc("next_ref", {
    p_scope: "projectoffice",
    p_default_prefix: "PRJ",
  });
  if (refError) return { error: `Could not mint a reference: ${refError.message}` };

  const { data: project, error: projectError } = await supabase
    .from("project_offices")
    .insert({
      ref: refData,
      title: projectTitle,
      project_type: projectType,
      work_type: workType,
      client_id: resolvedClientId,
      city: lead.city,
      site_address: lead.site_location,
      status: "ENQUIRY",
      lead_id: lead.id,
      created_by_id: user?.id ?? null,
    })
    .select("id")
    .single();
  if (projectError) return { error: projectError.message };

  // Seed the default phase plan (DEFAULT_PHASE_PLAN, packages/contracts/src/schemas.ts).
  const DEFAULT_PHASE_PLAN = [
    { code: "APPOINTMENT", label: "Appointment & Engagement", billingPct: 15 },
    { code: "INITIATION", label: "Initiation & Brief", billingPct: 5 },
    { code: "CONCEPT_DESIGN", label: "Concept Design", billingPct: 10 },
    { code: "DESIGN_DEVELOPMENT", label: "Design Development", billingPct: 15 },
    { code: "STATUTORY_COORDINATION", label: "Statutory Coordination", billingPct: 15 },
    { code: "CONSTRUCTION_DOCUMENTATION", label: "Construction Documentation", billingPct: 15 },
    { code: "TENDER_APPOINTMENT", label: "Tender & Appointment", billingPct: 5 },
    { code: "CONSTRUCTION_ADMINISTRATION", label: "Construction Administration", billingPct: 15 },
    { code: "HANDOVER_CLOSEOUT", label: "Handover & Closeout", billingPct: 5 },
  ];
  await supabase.from("phases").insert(
    DEFAULT_PHASE_PLAN.map((s, i) => ({
      project_id: project.id,
      code: s.code,
      label: s.label,
      billing_pct: s.billingPct,
      sort_order: (i + 1) * 10,
    })),
  );

  const { error: updateLeadError } = await supabase
    .from("leads")
    .update({
      status: "QUALIFIED",
      converted_client_id: resolvedClientId,
      converted_project_id: project.id,
      conflict_check_done: true,
      conflict_check_notes: conflictCheckNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);
  if (updateLeadError) return { error: updateLeadError.message };

  // The conflict-of-interest attestation gates a COA-1989 obligation, so it
  // belongs in the immutable audit trail, not only in a lead column that
  // stays editable afterwards.
  await supabase.rpc("write_audit", {
    p_entity: "lead",
    p_entity_id: leadId,
    p_action: "CONVERT",
    p_before: { status: lead.status },
    p_after: {
      status: "QUALIFIED",
      convertedProjectId: project.id,
      convertedClientId: resolvedClientId,
      conflictCheckDone: true,
      conflictCheckNotes,
    },
  });
  await supabase.rpc("write_audit", {
    p_entity: "project_office",
    p_entity_id: project.id,
    p_action: "CREATE",
    p_before: null,
    p_after: { ref: refData, title: projectTitle, leadRef: lead.ref },
  });

  revalidatePath("/leads");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
