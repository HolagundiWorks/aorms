package com.aorms.mobile.ui.documents

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.DocumentIssueRow
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch

/**
 * Mobile "Documents" tab (2026-09-26) — ROADMAP.md's Android IA spec calls
 * for "Documents (consume only — view/approve/share, no bulk admin)".
 * Backed by the Document Issues register (`document_issues`) — a flat,
 * cross-entity revision/issue log (letters, contracts, proposals,
 * transmittals, inspections, spec-sheets, MoMs), append-only by RLS design
 * (no update/delete policy, same as `audit_log`). Chosen over the
 * `drawings` table (DXF/PDF files) because drawings has no simple "view
 * the file" action even on the web app — only a DXF→SVG/issue-PDF
 * pipeline that depends on a job-queue gateway whose deployment status
 * isn't verified (see CLAUDE.md's own flagged risk on this) — building a
 * mobile "view" around an unverified dependency risked shipping something
 * that silently doesn't work. This is genuinely "consume only": no
 * logging-a-new-issue form here (that stays web-only, matching the
 * "act, not administer" scope discipline the Projects/Approvals views
 * already established) — "share" is a native Android share-sheet action,
 * not a new write.
 */
class DocumentsViewModel : ViewModel() {
    var issues by mutableStateOf<List<DocumentIssueRow>>(emptyList())
    var loading by mutableStateOf(true)
    var error by mutableStateOf<String?>(null)

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching { issues = Repository.documentIssues() }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }
}
