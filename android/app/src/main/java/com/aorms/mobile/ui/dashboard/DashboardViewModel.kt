package com.aorms.mobile.ui.dashboard

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.Supa
import kotlinx.coroutines.launch

class DashboardViewModel : ViewModel() {
    var loading by mutableStateOf(true)
    var myOpenTasks by mutableStateOf(0L)
    var openLeads by mutableStateOf(0L)
    var openSnags by mutableStateOf(0L)
    var userName by mutableStateOf("")

    fun load() {
        val user = Supa.auth.currentUserOrNull()
        userName = user?.email ?: ""
        val userId = user?.id ?: return
        loading = true
        viewModelScope.launch {
            myOpenTasks = runCatching { Repository.myOpenTaskCount(userId) }.getOrDefault(0)
            openLeads = runCatching { Repository.openLeadCount() }.getOrDefault(0)
            openSnags = runCatching { Repository.openSnagCount() }.getOrDefault(0)
            loading = false
        }
    }
}
