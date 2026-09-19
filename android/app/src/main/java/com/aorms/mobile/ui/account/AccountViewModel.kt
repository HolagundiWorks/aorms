package com.aorms.mobile.ui.account

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.FirmMembershipRow
import com.aorms.mobile.data.MyProfile
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.Supa
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch

/**
 * Deliberately no AORMS Identity here — explicit request: plain login/
 * logout only, plus basic profile details and the ability to switch
 * between firms this profile already belongs to (profile_firm_
 * memberships / switch_active_firm() RPC, migration 0055 — same
 * mechanism the web app's /select-studio picker uses).
 */
class AccountViewModel : ViewModel() {
    var loading by mutableStateOf(true)
    var email by mutableStateOf("")
    var profile by mutableStateOf<MyProfile?>(null)
    var firms by mutableStateOf<List<FirmMembershipRow>>(emptyList())
    var switching by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    fun load() {
        val user = Supa.auth.currentUserOrNull() ?: return
        email = user.email ?: ""
        loading = true
        viewModelScope.launch {
            runCatching {
                profile = Repository.myProfile(user.id)
                firms = Repository.myFirms(user.id)
            }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }

    fun switchFirm(firmId: String) {
        if (firmId == profile?.firmId) return
        switching = true
        viewModelScope.launch {
            runCatching { Repository.switchFirm(firmId) }
                .onFailure { error = it.toUserMessage() }
            switching = false
            load()
        }
    }

    fun signOut() {
        viewModelScope.launch { Supa.auth.signOut() }
    }
}
