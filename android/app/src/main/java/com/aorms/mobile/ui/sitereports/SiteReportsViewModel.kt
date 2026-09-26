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
import com.aorms.mobile.data.SiteInspectionReportRow
import com.aorms.mobile.data.SiteInstructionRow
import com.aorms.mobile.data.SnagRow
import com.aorms.mobile.data.toUserMessage
import java.io.File
import kotlinx.coroutines.launch

class SiteReportsViewModel : ViewModel() {
    var tab by mutableIntStateOf(0)
    var projects by mutableStateOf<List<ProjectOption>>(emptyList())

    var progressReports by mutableStateOf<List<ProgressReportRow>>(emptyList())
    var snags by mutableStateOf<List<SnagRow>>(emptyList())
    var instructions by mutableStateOf<List<SiteInstructionRow>>(emptyList())
    var inspections by mutableStateOf<List<SiteInspectionReportRow>>(emptyList())

    var loading by mutableStateOf(true)
    var showNewSheet by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    // Inspections' own capture flow uses a separate submitting flag, not
    // showNewSheet's shared shape — it uploads real bytes over HTTP, so
    // "submitting" needs to survive independently of the other three
    // tabs' plain Postgrest-insert create flows. Whether the sheet is
    // *open* is intentionally NOT a ViewModel field (unlike showNewSheet)
    // — it lives in SiteReportsScreen's own rememberSaveable state
    // instead, since a plain ViewModel field doesn't survive the process
    // death that launching the camera can trigger (confirmed live,
    // reproducible — see NewInspectionSheet's own comment for the full
    // account), while rememberSaveable does. inspectionSubmitted is the
    // one-shot signal the Composable watches to know when to close that
    // sheet on a real success.
    var submittingInspection by mutableStateOf(false)
    var inspectionSubmitted by mutableStateOf(false)

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching {
                if (projects.isEmpty()) projects = Repository.projects()
                progressReports = Repository.progressReports()
                snags = Repository.snags()
                instructions = Repository.siteInstructions()
                inspections = Repository.siteInspectionReports()
            }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }

    fun submitInspection(
        projectId: String,
        summary: String,
        issuesFound: Boolean,
        followUpRequired: Boolean,
        followUpNotes: String?,
        photos: List<File>,
    ) {
        if (projectId.isBlank()) {
            error = "Project is required."
            return
        }
        if (summary.isBlank()) {
            error = "Summary is required."
            return
        }
        submittingInspection = true
        viewModelScope.launch {
            runCatching {
                Repository.uploadSiteInspection(projectId, summary, issuesFound, followUpRequired, followUpNotes, photos)
            }.onSuccess { result ->
                inspectionSubmitted = true
                if (result.photosUploaded < result.photosSubmitted) {
                    error = "${result.ref} logged, but only ${result.photosUploaded} of ${result.photosSubmitted} photos uploaded."
                }
            }.onFailure {
                error = it.toUserMessage()
            }
            submittingInspection = false
            load()
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
