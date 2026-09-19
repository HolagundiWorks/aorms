package com.aorms.mobile.ui.dashboard

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.Supa
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * Same six Pulse KPIs the web app's /pulse page shows (critical, blocked,
 * open gaps, low confidence, projects at risk, open revisions) — found
 * live (2026-09-19) that this screen originally showed three different,
 * ad-hoc numbers that didn't match what "Pulse" means anywhere else in
 * the product. Now reads the same tables/thresholds, so it agrees.
 */
class DashboardViewModel : ViewModel() {
    var loading by mutableStateOf(true)
    var userName by mutableStateOf("")

    var critical by mutableStateOf(0L)
    var blocked by mutableStateOf(0L)
    var openGaps by mutableStateOf(0L)
    var lowConfidence by mutableStateOf(0L)
    var projectsAtRisk by mutableStateOf(0L)
    var openRevisions by mutableStateOf(0L)

    fun load() {
        val user = Supa.auth.currentUserOrNull()
        userName = user?.email ?: ""
        loading = true
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        viewModelScope.launch {
            critical = runCatching { Repository.pulseCriticalCount() }.getOrDefault(0)
            blocked = runCatching { Repository.pulseBlockedCount() }.getOrDefault(0)
            openGaps = runCatching { Repository.pulseOpenGapsCount() }.getOrDefault(0)
            lowConfidence = runCatching { Repository.pulseLowConfidenceCount() }.getOrDefault(0)
            projectsAtRisk = runCatching { Repository.pulseProjectsAtRiskCount(today) }.getOrDefault(0)
            openRevisions = runCatching { Repository.pulseOpenRevisionsCount() }.getOrDefault(0)
            loading = false
        }
    }
}
