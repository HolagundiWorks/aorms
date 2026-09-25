package com.aorms.mobile.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Column names/types here match web/supabase/migrations exactly (checked
 * live against aorms-web this session) — firm_id is deliberately never
 * read or written from this app; RLS fills it from the session on every
 * insert (same `default current_firm_id()` mechanism the web app's own
 * direct .insert() calls rely on), and scopes every select to it too.
 */

@Serializable
data class ProjectOption(
    val id: String,
    val ref: String,
    val title: String,
)

@Serializable
data class ClientNameHolder(val name: String? = null)

/** Richer than [ProjectOption] (which stays a lightweight id/ref/title
 * picker shape used by task/lead/site-report forms) — this is the row
 * shape for the mobile Projects list/detail screen, same columns the web
 * app's own `/projects` page selects. */
@Serializable
data class ProjectRow(
    val id: String,
    val ref: String,
    val title: String,
    @SerialName("project_type") val projectType: String? = null,
    @SerialName("work_type") val workType: String? = null,
    val status: String,
    val city: String? = null,
    val clients: ClientNameHolder? = null,
)

@Serializable
data class PhaseRow(
    val id: String,
    val code: String,
    val label: String,
    @SerialName("sort_order") val sortOrder: Int? = null,
)

@Serializable
data class TaskRow(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    val status: String,
    val priority: String,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("priority_score") val priorityScore: Int = 0,
)

@Serializable
data class NewTask(
    val title: String,
    val description: String? = null,
    @SerialName("project_id") val projectId: String? = null,
    val status: String = "TODO",
    val priority: String = "MEDIUM",
    @SerialName("due_date") val dueDate: String? = null,
    // Bug fix (2026-09-21): the New Task sheet is a quick-capture flow with
    // no assignee picker, so a task created here always ended up with a
    // null assignee_id — invisible from the creator's own "my tasks" query
    // (Repository.myTasks filters `assignee_id = <current user>`), even
    // though the row was really inserted (confirmed via the web app's
    // office-wide /tasks table). Default to self-assignment, same as any
    // quick-add flow would reasonably do until a real assignee picker exists.
    @SerialName("assignee_id") val assigneeId: String? = null,
)

@Serializable
data class TaskStatusPatch(val status: String)

@Serializable
data class LeadRow(
    val id: String,
    val ref: String,
    @SerialName("client_name") val clientName: String,
    @SerialName("lead_source") val leadSource: String,
    @SerialName("project_type") val projectType: String? = null,
    val city: String? = null,
    val phone: String? = null,
    val status: String,
)

@Serializable
data class NewLead(
    val ref: String,
    @SerialName("client_name") val clientName: String,
    @SerialName("lead_source") val leadSource: String,
    @SerialName("project_type") val projectType: String? = null,
    val city: String? = null,
    val phone: String? = null,
    val notes: String? = null,
)

@Serializable
data class ProgressReportRow(
    val id: String,
    @SerialName("project_id") val projectId: String,
    @SerialName("period_start") val periodStart: String,
    @SerialName("period_end") val periodEnd: String,
    val narrative: String? = null,
    @SerialName("physical_progress_pct") val physicalProgressPct: Int? = null,
    val status: String,
)

@Serializable
data class NewProgressReport(
    @SerialName("project_id") val projectId: String,
    @SerialName("period_start") val periodStart: String,
    @SerialName("period_end") val periodEnd: String,
    val narrative: String? = null,
    @SerialName("physical_progress_pct") val physicalProgressPct: Int? = null,
    @SerialName("schedule_progress_pct") val scheduleProgressPct: Int? = null,
)

@Serializable
data class SnagRow(
    val id: String,
    val ref: String,
    @SerialName("project_id") val projectId: String,
    val location: String? = null,
    val trade: String? = null,
    val description: String,
    val status: String,
)

@Serializable
data class NewSnag(
    val ref: String,
    @SerialName("project_id") val projectId: String,
    val location: String? = null,
    val trade: String? = null,
    val description: String,
)

@Serializable
data class SiteInstructionRow(
    val id: String,
    val ref: String,
    @SerialName("project_id") val projectId: String,
    val subject: String,
    val body: String? = null,
    @SerialName("issued_at") val issuedAt: String? = null,
)

@Serializable
data class NewSiteInstruction(
    val ref: String,
    @SerialName("project_id") val projectId: String,
    val subject: String,
    val body: String? = null,
)

// ---- Approvals (mobile Approvals view — 2026-09-25) ----

@Serializable
data class ApprovalRow(
    val id: String,
    @SerialName("entity_type") val entityType: String,
    val title: String,
    val recipient: String? = null,
    val channel: String,
    val status: String,
    @SerialName("sent_date") val sentDate: String? = null,
    @SerialName("project_offices") val projectOffices: ProjectTitleHolder? = null,
)

@Serializable
data class ApprovalStatusPatch(val status: String)

@Serializable
data class NextRefArgs(
    @SerialName("p_scope") val scope: String,
    @SerialName("p_default_prefix") val defaultPrefix: String,
)

// ---- Pulse KPIs (mirrors app/(app)/pulse/page.tsx's own tiles exactly —
// same tables, same thresholds, so the numbers agree with the web app) ----

@Serializable
data class RiskTaskRow(
    @SerialName("project_id") val projectId: String? = null,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("priority_score") val priorityScore: Int = 0,
)

@Serializable
data class BlockedDepProjectRow(val tasks: ProjectIdHolder? = null)

@Serializable
data class ProjectIdHolder(@SerialName("project_id") val projectId: String? = null)

// ---- Pulse KPI drill-down rows (2026-09-20) ----

@Serializable
data class ProjectTitleHolder(val title: String? = null)

@Serializable
data class TaskTitleHolder(val title: String? = null)

@Serializable
data class TaskDetailRow(
    val id: String,
    val title: String,
    @SerialName("due_date") val dueDate: String? = null,
    @SerialName("project_offices") val projectOffices: ProjectTitleHolder? = null,
)

@Serializable
data class BlockedTaskDetailRow(
    val id: String,
    val tasks: TaskTitleHolder? = null,
    @SerialName("depends_on") val dependsOn: TaskTitleHolder? = null,
)

@Serializable
data class MissingParamDetailRow(
    val id: String,
    @SerialName("parameter_type") val parameterType: String,
    val description: String,
    val tasks: TaskTitleHolder? = null,
)

@Serializable
data class DecisionDetailRow(
    val id: String,
    val title: String,
    val state: String,
    @SerialName("project_offices") val projectOffices: ProjectTitleHolder? = null,
)

@Serializable
data class RiskProjectRow(
    val id: String,
    val title: String,
)

// ---- Profile / firm switching (no AORMS Identity — plain login/logout only) ----

@Serializable
data class MyProfile(
    @SerialName("full_name") val fullName: String,
    val role: String,
    @SerialName("firm_id") val firmId: String? = null,
)

@Serializable
data class FirmName(@SerialName("company_name") val companyName: String)

@Serializable
data class FirmMembershipRow(
    @SerialName("firm_id") val firmId: String,
    val role: String,
    val firms: FirmName? = null,
)

@Serializable
data class SwitchFirmArgs(@SerialName("p_firm_id") val firmId: String)
