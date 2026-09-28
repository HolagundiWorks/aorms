package com.aorms.mobile.data

import com.aorms.mobile.BuildConfig
import io.github.jan.supabase.postgrest.query.Columns
import io.github.jan.supabase.postgrest.query.Order
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.util.concurrent.TimeUnit

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

    // ---- Pulse KPIs — same tables/thresholds as app/(app)/pulse/page.tsx
    // and lib/pulse/{scoring,queries}.ts, so these numbers agree with what
    // the web app shows for the same firm. priority_score/confidence_score
    // are pre-computed server-side (recomputeTaskScores(), migration
    // 0053+'s per-firm cron) — this never re-derives the scoring formula
    // itself, only reads the stored result and applies the same band
    // cutoff (bandForScore(): CRITICAL is priority_score >= 70).

    suspend fun pulseCriticalCount(): Long =
        Supa.db.from("tasks").select {
            filter {
                neq("status", "DONE")
                gte("priority_score", 70)
            }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    suspend fun pulseBlockedCount(): Long =
        Supa.db.from("task_dependencies").select {
            filter {
                eq("dependency_type", "BLOCKS")
                eq("status", "OPEN")
            }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    suspend fun pulseOpenGapsCount(): Long =
        Supa.db.from("task_missing_params").select {
            filter { eq("status", "OPEN") }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    suspend fun pulseLowConfidenceCount(): Long =
        Supa.db.from("tasks").select {
            filter {
                neq("status", "DONE")
                lt("confidence_score", 60)
            }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    /** In-flight decisions — OPEN (drafted, not sent) or CLIENT_REVIEW (sent, awaiting response) — matches app/(app)/pulse/page.tsx's own "Open revisions" query exactly. */
    suspend fun pulseOpenRevisionsCount(): Long =
        Supa.db.from("decisions").select {
            filter { isIn("state", listOf("OPEN", "CLIENT_REVIEW")) }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

    /** A project counts "at risk" if it has an open task that's overdue, CRITICAL band, or blocked on another — same three signals as getProjectsAtRiskCount() in lib/pulse/queries.ts. */
    suspend fun pulseProjectsAtRiskCount(today: String): Long = atRiskProjectIds(today).size.toLong()

    private suspend fun atRiskProjectIds(today: String): Set<String> {
        val openTasks = Supa.db.from("tasks").select(Columns.list("project_id, due_date, priority_score")) {
            filter { neq("status", "DONE") }
        }.decodeList<RiskTaskRow>()

        val blockedProjects = Supa.db.from("task_dependencies")
            .select(Columns.raw("tasks!task_dependencies_task_id_fkey(project_id)")) {
                filter {
                    eq("dependency_type", "BLOCKS")
                    eq("status", "OPEN")
                }
            }.decodeList<BlockedDepProjectRow>()

        val atRisk = mutableSetOf<String>()
        for (t in openTasks) {
            val projectId = t.projectId ?: continue
            val overdue = t.dueDate != null && t.dueDate < today
            if (overdue || t.priorityScore >= 70) atRisk.add(projectId)
        }
        for (d in blockedProjects) {
            d.tasks?.projectId?.let { atRisk.add(it) }
        }
        return atRisk
    }

    // ---- Pulse KPI drill-down (2026-09-20, explicit user request: "on
    // clicking kpi tiles expand and show detail") — a small, capped detail
    // list per tile, mirroring the same tables/filters as the six count
    // queries above, and (where a web equivalent exists) lib/pulse/
    // queries.ts's own getTopPriorityTasks/getBlockedTasks/
    // getOpenMissingParams/getLowConfidenceTasks. ----

    suspend fun criticalTaskDetails(limit: Long = 5): List<TaskDetailRow> =
        Supa.db.from("tasks").select(Columns.raw("id, title, due_date, project_offices(title)")) {
            filter {
                neq("status", "DONE")
                gte("priority_score", 70)
            }
            order("priority_score", Order.DESCENDING)
            limit(limit)
        }.decodeList()

    suspend fun lowConfidenceTaskDetails(limit: Long = 5): List<TaskDetailRow> =
        Supa.db.from("tasks").select(Columns.raw("id, title, due_date, project_offices(title)")) {
            filter {
                neq("status", "DONE")
                lt("confidence_score", 60)
            }
            order("confidence_score", Order.ASCENDING)
            limit(limit)
        }.decodeList()

    suspend fun blockedTaskDetails(limit: Long = 5): List<BlockedTaskDetailRow> =
        Supa.db.from("task_dependencies").select(
            Columns.raw("id, tasks!task_dependencies_task_id_fkey(title), depends_on:tasks!task_dependencies_depends_on_task_id_fkey(title)"),
        ) {
            filter {
                eq("dependency_type", "BLOCKS")
                eq("status", "OPEN")
            }
            order("created_at", Order.DESCENDING)
            limit(limit)
        }.decodeList()

    suspend fun missingParamDetails(limit: Long = 5): List<MissingParamDetailRow> =
        Supa.db.from("task_missing_params").select(Columns.raw("id, parameter_type, description, tasks(title)")) {
            filter { eq("status", "OPEN") }
            order("created_at", Order.DESCENDING)
            limit(limit)
        }.decodeList()

    suspend fun openRevisionDetails(limit: Long = 5): List<DecisionDetailRow> =
        Supa.db.from("decisions").select(Columns.raw("id, title, state, project_offices(title)")) {
            filter { isIn("state", listOf("OPEN", "CLIENT_REVIEW")) }
            order("created_at", Order.DESCENDING)
            limit(limit)
        }.decodeList()

    suspend fun projectsAtRiskDetails(today: String, limit: Int = 5): List<RiskProjectRow> {
        val ids = atRiskProjectIds(today).toList().take(limit)
        if (ids.isEmpty()) return emptyList()
        return Supa.db.from("project_offices").select(Columns.list("id, title")) {
            filter { isIn("id", ids) }
        }.decodeList()
    }

    // ---- Profile / firm switching ----

    suspend fun myProfile(userId: String): MyProfile =
        Supa.db.from("profiles").select(Columns.list("full_name, role, firm_id")) {
            filter { eq("id", userId) }
        }.decodeSingle()

    suspend fun myFirms(userId: String): List<FirmMembershipRow> =
        Supa.db.from("profile_firm_memberships")
            .select(Columns.list("firm_id, role, firms(company_name)")) {
                filter { eq("profile_id", userId) }
            }.decodeList()

    suspend fun switchFirm(firmId: String) {
        val args = Json.encodeToJsonElement(SwitchFirmArgs.serializer(), SwitchFirmArgs(firmId = firmId)).jsonObject
        Supa.db.rpc("switch_active_firm", args)
    }

    suspend fun projects(): List<ProjectOption> =
        Supa.db.from("project_offices")
            .select(Columns.list("id, ref, title")) { order("title", Order.ASCENDING) }
            .decodeList()

    // ---- Projects (mobile Projects view — 2026-09-25) ----

    /** Richer than [projects] — same columns as the web app's own
     * /projects list page, for the mobile Projects tab. */
    suspend fun projectsFull(): List<ProjectRow> =
        Supa.db.from("project_offices")
            .select(Columns.list("id, ref, title, project_type, work_type, status, city, clients(name)")) {
                order("created_at", Order.DESCENDING)
            }.decodeList()

    suspend fun phasesForProject(projectId: String): List<PhaseRow> =
        Supa.db.from("phases")
            .select(Columns.list("id, code, label, sort_order")) {
                filter { eq("project_id", projectId) }
                order("sort_order", Order.ASCENDING)
            }.decodeList()

    suspend fun openTaskCountForProject(projectId: String): Long =
        Supa.db.from("tasks").select {
            filter {
                eq("project_id", projectId)
                neq("status", "DONE")
            }
            count(io.github.jan.supabase.postgrest.query.Count.EXACT)
        }.countOrNull() ?: 0L

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

    // ---- Approvals ----

    suspend fun approvals(): List<ApprovalRow> =
        Supa.db.from("approvals")
            .select(Columns.list("id, entity_type, title, recipient, channel, status, sent_date, project_offices(title)")) {
                order("created_at", Order.DESCENDING)
            }.decodeList()

    suspend fun updateApprovalStatus(id: String, status: String) {
        Supa.db.from("approvals").update(ApprovalStatusPatch(status)) {
            filter { eq("id", id) }
        }
    }

    // ---- Document Issues (read-only on mobile) ----

    suspend fun documentIssues(): List<DocumentIssueRow> =
        Supa.db.from("document_issues")
            .select(Columns.list("id, entity_type, ref, version_no, revision_note, impact_note, issued_at, project_offices(title)")) {
                order("issued_at", Order.DESCENDING)
            }.decodeList()

    suspend fun nextLeadRef(): String = nextRef("lead", "LDR")

    /** Calls the same next_ref() Postgres function the web app's Server Actions use for gap-free per-firm numbering. */
    private suspend fun nextRef(scope: String, defaultPrefix: String): String {
        val args = Json.encodeToJsonElement(NextRefArgs.serializer(), NextRefArgs(scope = scope, defaultPrefix = defaultPrefix)).jsonObject
        return Supa.db.rpc("next_ref", args).decodeAs()
    }

    // ---- Site Inspections ----

    suspend fun siteInspectionReports(): List<SiteInspectionReportRow> =
        Supa.db.from("site_inspection_reports")
            .select(Columns.list("id, ref, project_offices(title), visit_date, summary, issues_found, follow_up_required, status")) {
                order("visit_date", Order.DESCENDING)
            }.decodeList()

    /**
     * The one upload in this app that isn't a direct Postgrest call —
     * Storage has no client-writable RLS policy anywhere in this schema
     * (confirmed live: zero policies on storage.objects), so this goes
     * through web/app/api/mobile/inspections/route.ts's own bearer-
     * authenticated Route Handler instead, which does the real work
     * (RLS-scoped insert, then a service-role Storage write per photo)
     * exactly like lib/drawings/upload.ts does for the web app itself.
     */
    suspend fun uploadSiteInspection(
        projectId: String,
        summary: String,
        issuesFound: Boolean,
        followUpRequired: Boolean,
        followUpNotes: String?,
        photos: List<File>,
    ): SiteInspectionUploadResult {
        val token = Supa.auth.currentAccessTokenOrNull() ?: error("Not signed in.")

        val bodyBuilder = MultipartBody.Builder().setType(MultipartBody.FORM)
            .addFormDataPart("projectId", projectId)
            .addFormDataPart("summary", summary)
            .addFormDataPart("issuesFound", issuesFound.toString())
            .addFormDataPart("followUpRequired", followUpRequired.toString())
        followUpNotes?.let { bodyBuilder.addFormDataPart("followUpNotes", it) }
        photos.forEach { file ->
            bodyBuilder.addFormDataPart("photos", file.name, file.asRequestBody("image/jpeg".toMediaType()))
        }

        val request = Request.Builder()
            .url("${BuildConfig.WEB_BASE_URL}/api/mobile/inspections")
            .header("Authorization", "Bearer $token")
            .post(bodyBuilder.build())
            .build()

        val responseText = withContext(Dispatchers.IO) {
            AppHttp.client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val message = runCatching { Json.decodeFromString(MobileApiError.serializer(), text).error }.getOrNull()
                    error(message ?: "Upload failed (HTTP ${response.code}).")
                }
                text
            }
        }
        return Json.decodeFromString(SiteInspectionUploadResult.serializer(), responseText)
    }

    /**
     * Mobile Esti — contextual commands, not a chatbot (2026-09-27). Fixed
     * command enum ("TODAY_FOCUS" / "PROJECT_SUMMARY"), never a free-text
     * question from this app — web/app/api/mobile/esti/route.ts enforces
     * that server-side too. A longer read timeout than the shared
     * `AppHttp.client` default (10s) — that default is fine for the single
     * multipart upload above, but an LLM tool-calling loop can genuinely
     * take longer than that.
     */
    suspend fun askEsti(command: String, projectId: String? = null): String {
        val token = Supa.auth.currentAccessTokenOrNull() ?: error("Not signed in.")

        val bodyJson = Json.encodeToJsonElement(
            EstiCommandRequest.serializer(),
            EstiCommandRequest(command = command, projectId = projectId),
        ).jsonObject.toString()

        val request = Request.Builder()
            .url("${BuildConfig.WEB_BASE_URL}/api/mobile/esti")
            .header("Authorization", "Bearer $token")
            .post(bodyJson.toRequestBody("application/json".toMediaType()))
            .build()

        val longClient = AppHttp.client.newBuilder().readTimeout(60, TimeUnit.SECONDS).build()
        val responseText = withContext(Dispatchers.IO) {
            longClient.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val message = runCatching { Json.decodeFromString(MobileApiError.serializer(), text).error }.getOrNull()
                    error(message ?: "Esti request failed (HTTP ${response.code}).")
                }
                text
            }
        }
        return Json.decodeFromString(EstiAnswerResult.serializer(), responseText).output
    }
}

/** One shared OkHttp client for the app (standard practice — connection
 * pooling, not a new client per call) — used only for the one endpoint
 * this app calls outside Supabase itself, see uploadSiteInspection above. */
private object AppHttp {
    val client = OkHttpClient()
}
