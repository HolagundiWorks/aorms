package com.aorms.mobile.ui.projects

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.NewTask
import com.aorms.mobile.data.PhaseRow
import com.aorms.mobile.data.ProjectRow
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.Supa
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch

/**
 * Mobile "Projects" tab (2026-09-25) — ROADMAP.md's Android IA spec calls
 * for a "trimmed mobile Projects view (view + act, not administer)".
 * "View" is this screen's list + expand-in-place detail (phases, open task
 * count) — same idiom as TodayViewModel.expandedKpi, just keyed by project
 * id instead of a KPI key. "Act" is deliberately narrow: adding a task to
 * a project from its own detail panel, reusing the exact same
 * Repository.createTask/NewTask flow Today/Tasks already have — no new
 * workflow logic. Changing a project's own status is NOT exposed here: the
 * web app's equivalent control is gated by an activation-gate state
 * machine (DNA capture required for some transitions, ACTIVE only reachable
 * via a separate gate flow), which is exactly the "workflow administration"
 * the roadmap says to keep off mobile — explicit decision, not an oversight.
 */
class ProjectsViewModel : ViewModel() {
    var projects by mutableStateOf<List<ProjectRow>>(emptyList())
    var loading by mutableStateOf(true)
    var error by mutableStateOf<String?>(null)

    var expandedProjectId by mutableStateOf<String?>(null)
    var phasesLoading by mutableStateOf(false)
    var phases by mutableStateOf<List<PhaseRow>>(emptyList())
    var openTaskCount by mutableStateOf(0L)
    private val phasesCache = mutableMapOf<String, List<PhaseRow>>()
    private val openTaskCountCache = mutableMapOf<String, Long>()

    var showNewTaskFor by mutableStateOf<ProjectRow?>(null)

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching { projects = Repository.projectsFull() }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }

    /** Toggle a project row's expanded detail — collapses if it's already
     * open, otherwise expands and loads (or reuses the cached) phases/open
     * task count. Same shape as TodayViewModel.toggleKpi. */
    fun toggleProject(id: String) {
        if (expandedProjectId == id) {
            expandedProjectId = null
            return
        }
        expandedProjectId = id
        phasesCache[id]?.let { cachedPhases ->
            phases = cachedPhases
            openTaskCount = openTaskCountCache[id] ?: 0L
            return
        }
        loadDetail(id)
    }

    private fun loadDetail(projectId: String) {
        phases = emptyList()
        phasesLoading = true
        viewModelScope.launch {
            val loadedPhases = runCatching { Repository.phasesForProject(projectId) }.getOrElse {
                error = it.toUserMessage()
                emptyList()
            }
            val count = runCatching { Repository.openTaskCountForProject(projectId) }.getOrDefault(0L)
            phasesCache[projectId] = loadedPhases
            openTaskCountCache[projectId] = count
            if (expandedProjectId == projectId) {
                phases = loadedPhases
                openTaskCount = count
            }
            phasesLoading = false
        }
    }

    fun addTask(title: String, priority: String, dueDate: String?) {
        if (title.isBlank()) {
            error = "Title is required."
            return
        }
        val project = showNewTaskFor ?: return
        val userId = Supa.auth.currentUserOrNull()?.id
        viewModelScope.launch {
            runCatching {
                Repository.createTask(
                    NewTask(title = title, projectId = project.id, priority = priority, dueDate = dueDate, assigneeId = userId),
                )
            }.onSuccess {
                showNewTaskFor = null
                // Refresh this project's open-task count in place so the
                // detail panel reflects the new task without a full reload.
                openTaskCountCache.remove(project.id)
                if (expandedProjectId == project.id) loadDetail(project.id)
            }.onFailure {
                error = it.toUserMessage()
            }
        }
    }
}
