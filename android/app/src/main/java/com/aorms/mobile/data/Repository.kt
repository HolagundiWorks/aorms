package com.aorms.mobile.data

import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject

/**
 * Thin wrapper over Postgrest calls — every read/write here is scoped by
 * RLS to the signed-in profile's active firm automatically (current_firm_id(),
 * migration 0053+), same as every Server Action in the web app. Nothing
 * here ever reads or sets firm_id explicitly.
 */
object Repository {

    suspend fun myOpenTaskCount(userId: String): Long =
        Supa.db.from("tasks").select {
            filter {
                eq("assignee_id", userId)
                neq("status", "DONE")
            }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    suspend fun openLeadCount(): Long =
        Supa.db.from("leads").select {
            filter { neq("status", "CONVERTED") }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    suspend fun openSnagCount(): Long =
        Supa.db.from("snags").select {
            filter { neq("status", "CLOSED") }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    suspend fun projects(): List<ProjectOption> =
        Supa.db.from("project_offices")
            .select(Columns.list("id, ref, title")) { order("title", Order.ASCENDING) }
            .decodeList()

    // ---- Tasks ----

    suspend fun myTasks(userId: String): List<TaskRow> =
        Supa.db.from("tasks").select {
            filter { eq("assignee_id", userId) }
            order("priority_score", Order.DESCENDING)
        }.decodeList()

    suspend fun createTask(task: NewTask) {
        Supa.db.from("tasks").insert(task)
    }

    suspend fun setTaskStatus(id: String, status: String) {
        Supa.db.from("tasks").update(TaskStatusPatch(status)) {
            filter { eq("id", id) }
        }
    }

    // ---- Leads ----

    suspend fun leads(): List<LeadRow> =
        Supa.db.from("leads").select {
            order("created_at", Order.DESCENDING)
        }.decodeList()

    suspend fun createLead(lead: NewLead) {
        Supa.db.from("leads").insert(lead)
    }

    // ---- Site reports: progress reports / snags / site instructions ----

    suspend fun progressReports(): List<ProgressReportRow> =
        Supa.db.from("progress_reports").select {
            order("created_at", Order.DESCENDING)
            limit(50)
        }.decodeList()

    suspend fun createProgressReport(report: NewProgressReport) {
        Supa.db.from("progress_reports").insert(report)
    }

    suspend fun snags(): List<SnagRow> =
        Supa.db.from("snags").select {
            order("created_at", Order.DESCENDING)
            limit(50)
        }.decodeList()

    suspend fun createSnag(location: String?, trade: String?, description: String, projectId: String) {
        val ref = nextRef("snag", "SNG")
        Supa.db.from("snags").insert(
            NewSnag(ref = ref, projectId = projectId, location = location, trade = trade, description = description),
        )
    }

    suspend fun siteInstructions(): List<SiteInstructionRow> =
        Supa.db.from("site_instructions").select {
            order("created_at", Order.DESCENDING)
            limit(50)
        }.decodeList()

    suspend fun createSiteInstruction(subject: String, body: String?, projectId: String) {
        val ref = nextRef("siteinstruction", "SI")
        Supa.db.from("site_instructions").insert(
            NewSiteInstruction(ref = ref, projectId = projectId, subject = subject, body = body),
        )
    }

    suspend fun nextLeadRef(): String = nextRef("lead", "LDR")

    /** Calls the same next_ref() Postgres function the web app's Server Actions use for gap-free per-firm numbering. */
    private suspend fun nextRef(scope: String, defaultPrefix: String): String {
        val args = Json.encodeToJsonElement(NextRefArgs.serializer(), NextRefArgs(scope = scope, defaultPrefix = defaultPrefix)).jsonObject
        return Supa.db.rpc("next_ref", args).decodeAs()
    }
}
