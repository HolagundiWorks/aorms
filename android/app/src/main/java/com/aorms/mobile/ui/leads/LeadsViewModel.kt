package com.aorms.mobile.ui.leads

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aorms.mobile.data.LeadRow
import com.aorms.mobile.data.NewLead
import com.aorms.mobile.data.Repository
import com.aorms.mobile.data.toUserMessage
import kotlinx.coroutines.launch

class LeadsViewModel : ViewModel() {
    var leads by mutableStateOf<List<LeadRow>>(emptyList())
    var loading by mutableStateOf(true)
    var showNewLead by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    fun load() {
        loading = true
        viewModelScope.launch {
            runCatching { leads = Repository.leads() }.onFailure { error = it.toUserMessage() }
            loading = false
        }
    }

    fun createLead(clientName: String, leadSource: String, city: String?, phone: String?) {
        if (clientName.isBlank() || leadSource.isBlank()) {
            error = "Client name and lead source are required."
            return
        }
        viewModelScope.launch {
            runCatching {
                val ref = Repository.nextLeadRef()
                Repository.createLead(NewLead(ref = ref, clientName = clientName, leadSource = leadSource, city = city, phone = phone))
            }.onSuccess {
                showNewLead = false
            }.onFailure {
                error = it.toUserMessage()
            }
            load()
        }
    }
}
