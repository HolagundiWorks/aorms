package com.aorms.mobile.ui.today

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.NewTask
import com.aorms.mobile.data.ProjectOption
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.Supa
import com.aorms.mobile.data.TaskRow
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/** Uniform row shape for every KPI tile's expanded detail list — each
 * Repository query below has its own real row type, mapped down to this
 * common (primary, secondary) pair so TodayScreen renders all six the
 * same way instead of six bespoke list composables. */
data class KpiDetailRow(val primary: String, val secondary: String?)

/**
 * "Today" — the app's home screen (2026-09-20 redesign, explicit user
 * request: the default screen should answer "what do I need to deal
 * with today?" rather than show a raw KPI grid). Replaces the old
 * ui.dashboard package; the six Pulse KPIs it showed are kept, not
 * dropped — real, already-verified data — just demoted to a secondary
 * "Studio Pulse" section below the actual agenda. The agenda itself
 * (overdue/today/upcoming) is a client-side split of the exact same
 * myTasks() read TasksViewModel already uses — no new backend endpoint.
 */
class TodayViewModel : ViewModel() {
    var loading by mutableStateOf(true)
    var userName by mutableStateOf("")
    var error by mutableStateOf<String?>(null)
    var showNewTask by mutableStateOf(false)

    var overdueTasks by mutableStateOf<List<TaskRow>>(emptyList())
    var todayTasks by mutableStateOf<List<TaskRow>>(emptyList())
    var upcomingTasks by mutableStateOf<List<TaskRow>>(emptyList())
    var projects by mutableStateOf<List<ProjectOption>>(emptyList())

    var critical by mutableStateOf(0L)
    var blocked by mutableStateOf(0L)
    var openGaps by mutableStateOf(0L)
    var lowConfidence by mutableStateOf(0L)
    var projectsAtRisk by mutableStateOf(0L)
    var openRevisions by mutableStateOf(0L)

    // Pulse KPI drill-down — which tile (if any) is expanded, its detail
    // rows, and a per-tile cache so collapsing/re-expanding the same tile
    // doesn't re-fetch. Cache is intentionally session-only (cleared by a
    // fresh load()), not persisted — this is a live "what's happening
    // right now" view, not something that should show stale data after
    // a pull-to-refresh-style reload.
    var expandedKpi by mutableStateOf<String?>(null)
    var kpiDetailLoading by mutableStateOf(false)
    var kpiDetailRows by mutableStateOf<List<KpiDetailRow>>(emptyList())
    private val kpiDetailCache = mutableMapOf<String, List<KpiDetailRow>>()

    fun load() {
        val user = Supa.auth.currentUserOrNull() ?: return
        userName = user.email ?: ""
        loading = true
        kpiDetailCache.clear()
        expandedKpi = null
        kpiDetailRows = emptyList()
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        viewModelScope.launch {
            runCatching {
                val openTasks = Repository.myTasks(user.id).filter { it.status != "DONE" }
                overdueTasks = openTasks.filter { it.dueDate != null && it.dueDate < today }.sortedBy { it.dueDate }
                todayTasks = openTasks.filter { it.dueDate == today }
                upcomingTasks = openTasks.filter { it.dueDate != null && it.dueDate > today }
                    .sortedBy { it.dueDate }
                    .take(5)
                if (projects.isEmpty()) projects = Repository.projects()
            }.onFailure { error = it.toUserMessage() }

            critical = runCatching { Repository.pulseCriticalCount() }.getOrDefault(0)
            blocked = runCatching { Repository.pulseBlockedCount() }.getOrDefault(0)
            openGaps = runCatching { Repository.pulseOpenGapsCount() }.getOrDefault(0)
            lowConfidence = runCatching { Repository.pulseLowConfidenceCount() }.getOrDefault(0)
            projectsAtRisk = runCatching { Repository.pulseProjectsAtRiskCount(today) }.getOrDefault(0)
            openRevisions = runCatching { Repository.pulseOpenRevisionsCount() }.getOrDefault(0)
            loading = false
        }
    }

    fun markDone(id: String) {
        viewModelScope.launch {
            runCatching { Repository.setTaskStatus(id, "DONE") }
            load()
        }
    }

    fun createTask(title: String, projectId: String?, priority: String, dueDate: String?) {
        if (title.isBlank()) {
            error = "Title is required."
            return
        }
        val userId = Supa.auth.currentUserOrNull()?.id
        viewModelScope.launch {
            runCatching {
                Repository.createTask(
                    NewTask(title = title, projectId = projectId, priority = priority, dueDate = dueDate, assigneeId = userId),
                )
            }.onSuccess {
                showNewTask = false
            }.onFailure {
                error = it.toUserMessage()
            }
            load()
        }
    }

    fun projectTitle(projectId: String?): String? = projects.firstOrNull { it.id == projectId }?.title

    /** Toggle a Pulse tile's expanded detail — collapses if it's already
     * open, otherwise expands and loads (or reuses the cached) rows. */
    fun toggleKpi(key: String) {
        if (expandedKpi == key) {
            expandedKpi = null
            return
        }
        expandedKpi = key
        kpiDetailCache[key]?.let {
            kpiDetailRows = it
            return
        }
        kpiDetailRows = emptyList()
        kpiDetailLoading = true
        viewModelScope.launch {
            val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            val rows = runCatching {
                when (key) {
                    "critical" -> Repository.criticalTaskDetails().map {
                        KpiDetailRow(it.title, listOfNotNull(it.projectOffices?.title, it.dueDate?.let { d -> "due $d" }).joinToString(" · ").ifBlank { null })
                    }
                    "blocked" -> Repository.blockedTaskDetails().map {
                        KpiDetailRow(it.tasks?.title ?: "Untitled task", it.dependsOn?.title?.let { t -> "Blocked by $t" })
                    }
                    "openGaps" -> Repository.missingParamDetails().map {
                        KpiDetailRow(it.tasks?.title ?: "Untitled task", it.description)
                    }
                    "lowConfidence" -> Repository.lowConfidenceTaskDetails().map {
                        KpiDetailRow(it.title, it.projectOffices?.title)
                    }
                    "projectsAtRisk" -> Repository.projectsAtRiskDetails(today).map { KpiDetailRow(it.title, null) }
                    "openRevisions" -> Repository.openRevisionDetails().map {
                        KpiDetailRow(it.title, listOfNotNull(it.projectOffices?.title, it.state).joinToString(" · ").ifBlank { null })
                    }
                    else -> emptyList()
                }
            }.getOrElse {
                error = it.toUserMessage()
                emptyList()
            }
            kpiDetailCache[key] = rows
            if (expandedKpi == key) kpiDetailRows = rows
            kpiDetailLoading = false
        }
    }
}
