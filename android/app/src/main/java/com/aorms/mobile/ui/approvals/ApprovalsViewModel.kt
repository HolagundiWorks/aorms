package com.aorms.mobile.ui.approvals

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.ApprovalRow
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch

/**
 * Mobile "Approvals" tab (2026-09-25) — ROADMAP.md's Android IA spec calls
 * for "Approvals (its own one-tap surface)". Deliberately narrow: this is
 * a response surface, not a creation form — logging a new approval-for-
 * sign-off record (the web app's "Log approval" flow) stays web-only, same
 * "keep off mobile" reasoning already applied to project-status changes on
 * the Projects view. Acting here means recording a client/authority's
 * response (Approved/Revisions/Rejected) on something already sent, via
 * the same `updateApprovalStatus` the web app's own status control uses.
 */
class ApprovalsViewModel : ViewModel() {
    var approvals by mutableStateOf<List<ApprovalRow>>(emptyList())
    var loading by mutableStateOf(true)
    var error by mutableStateOf<String?>(null)

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching { approvals = Repository.approvals() }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }

    fun respond(id: String, status: String) {
        viewModelScope.launch {
            runCatching { Repository.updateApprovalStatus(id, status) }.onFailure { error = it.toUserMessage() }
            load()
        }
    }
}
