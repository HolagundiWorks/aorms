package com.aorms.mobile.ui.tasks

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
import kotlinx.coroutines.launch

class TasksViewModel : ViewModel() {
    var tasks by mutableStateOf<List<TaskRow>>(emptyList())
    var projects by mutableStateOf<List<ProjectOption>>(emptyList())
    var loading by mutableStateOf(true)
    var showNewTask by mutableStateOf(false)
    var error by mutableStateOf<String?>(null)

    fun load() {
        val userId = Supa.auth.currentUserOrNull()?.id ?: return
        loading = true
        viewModelScope.launch {
            runCatching {
                tasks = Repository.myTasks(userId)
                if (projects.isEmpty()) projects = Repository.projects()
            }.onFailure { error = it.message }
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
        viewModelScope.launch {
            runCatching {
                Repository.createTask(NewTask(title = title, projectId = projectId, priority = priority, dueDate = dueDate))
            }.onFailure { error = it.message }
            showNewTask = false
            load()
        }
    }
}
