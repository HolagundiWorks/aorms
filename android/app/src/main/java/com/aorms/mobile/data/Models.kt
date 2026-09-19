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

@Serializable
data class NextRefArgs(
    @SerialName("p_scope") val scope: String,
    @SerialName("p_default_prefix") val defaultPrefix: String,
)
