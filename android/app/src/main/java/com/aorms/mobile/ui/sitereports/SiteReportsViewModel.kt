package com.aorms.mobile.ui.sitereports

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.NewProgressReport
import com.aorms.mobile.data.ProgressReportRow
import com.aorms.mobile.data.ProjectOption
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.SiteInstructionRow
import com.aorms.mobile.data.SnagRow
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch

class SiteReportsViewModel : ViewModel() {
    var tab by mutableIntStateOf(0)
    var projects by mutableStateOf<List<ProjectOption>>(emptyList())

    var progressReports by mutableStateOf<List<ProgressReportRow>>(emptyList())
    var snags by mutableStateOf<List<SnagRow>>(emptyList())
    var instructions by mutableStateOf<List<SiteInstructionRow>>(emptyList())

    var loading by mutableStateOf(true)
    var showNewSheet by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching {
                if (projects.isEmpty()) projects = Repository.projects()
                progressReports = Repository.progressReports()
                snags = Repository.snags()
                instructions = Repository.siteInstructions()
            }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }

    fun createProgressReport(projectId: String, periodStart: String, periodEnd: String, narrative: String?, pct: Int?) {
        if (projectId.isBlank()) {
            error = "Project is required."
            return
        }
        if (periodStart.isBlank() || periodEnd.isBlank()) {
            error = "Period start and end are required."
            return
        }
        viewModelScope.launch {
            runCatching {
                Repository.createProgressReport(
                    NewProgressReport(projectId = projectId, periodStart = periodStart, periodEnd = periodEnd, narrative = narrative, physicalProgressPct = pct),
                )
            }.onSuccess {
                showNewSheet = false
            }.onFailure {
                error = it.toUserMessage()
            }
            load()
        }
    }

    fun createSnag(projectId: String, location: String?, trade: String?, description: String) {
        if (projectId.isBlank()) {
            error = "Project is required."
            return
        }
        if (description.isBlank()) {
            error = "Description is required."
            return
        }
        viewModelScope.launch {
            runCatching { Repository.createSnag(location, trade, description, projectId) }
                .onSuccess { showNewSheet = false }
                .onFailure { error = it.toUserMessage() }
            load()
        }
    }

    fun createInstruction(projectId: String, subject: String, body: String?) {
        if (projectId.isBlank()) {
            error = "Project is required."
            return
        }
        if (subject.isBlank()) {
            error = "Subject is required."
            return
        }
        viewModelScope.launch {
            runCatching { Repository.createSiteInstruction(subject, body, projectId) }
                .onSuccess { showNewSheet = false }
                .onFailure { error = it.toUserMessage() }
            load()
        }
    }
}
