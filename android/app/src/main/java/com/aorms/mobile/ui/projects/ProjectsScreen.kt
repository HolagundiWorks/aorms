package com.aorms.mobile.ui.projects

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aorms.mobile.data.PhaseRow
import com.aorms.mobile.data.ProjectOption
import com.aorms.mobile.data.ProjectRow
import com.aorms.mobile.ui.tasks.NewTaskSheet
import com.aorms.mobile.ui.theme.CarbonTile

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProjectsScreen(viewModel: ProjectsViewModel) {
    LaunchedEffect(Unit) { viewModel.load() }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(viewModel.error) {
        viewModel.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.error = null
        }
    }

    // No FAB on this screen — project creation is out of scope ("view + act,
    // not administer"), and "add task" lives inside each project's own
    // expanded detail panel, not a screen-level action.
    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            if (viewModel.projects.isEmpty() && !viewModel.loading) {
                Text("No projects yet.", modifier = Modifier.padding(24.dp))
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(horizontal = 12.dp),
                contentPadding = PaddingValues(top = 8.dp, bottom = 24.dp),
            ) {
                items(viewModel.projects) { project ->
                    val expanded = viewModel.expandedProjectId == project.id
                    ProjectRowTile(
                        project = project,
                        expanded = expanded,
                        onToggle = { viewModel.toggleProject(project.id) },
                    )
                    if (expanded) {
                        ProjectDetailPanel(
                            project = project,
                            loading = viewModel.phasesLoading,
                            phases = viewModel.phases,
                            openTaskCount = viewModel.openTaskCount,
                            onAddTask = { viewModel.showNewTaskFor = project },
                        )
                    }
                }
            }
        }
    }

    viewModel.showNewTaskFor?.let { project ->
        NewTaskSheet(
            projects = viewModel.projects.map { ProjectOption(it.id, it.ref, it.title) },
            initialProject = ProjectOption(project.id, project.ref, project.title),
            error = viewModel.error,
            onDismiss = { viewModel.showNewTaskFor = null; viewModel.error = null },
            onCreate = { title, _, priority, dueDate -> viewModel.addTask(title, priority, dueDate) },
        )
    }
}

@Composable
private fun ProjectRowTile(project: ProjectRow, expanded: Boolean, onToggle: () -> Unit) {
    CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp).clickable(onClick = onToggle)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(project.title, style = MaterialTheme.typography.titleMedium)
                Text(
                    listOfNotNull(project.ref, project.clients?.name, project.city).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(project.status, style = MaterialTheme.typography.bodySmall)
            }
            Icon(
                if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                contentDescription = if (expanded) "Collapse" else "Expand",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun ProjectDetailPanel(
    project: ProjectRow,
    loading: Boolean,
    phases: List<PhaseRow>,
    openTaskCount: Long,
    onAddTask: () -> Unit,
) {
    CarbonTile(modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                listOfNotNull(project.projectType, project.workType).joinToString(" · ").ifBlank { null }
                    ?: "No project/work type set.",
                style = MaterialTheme.typography.bodyMedium,
            )
            Text(
                "$openTaskCount open task${if (openTaskCount == 1L) "" else "s"}",
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 4.dp),
            )

            Text("Phases", style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(top = 16.dp, bottom = 4.dp))
            when {
                loading -> CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(vertical = 8.dp))
                phases.isEmpty() -> Text(
                    "No phases yet.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> phases.forEach { phase ->
                    Text(
                        "${phase.code} — ${phase.label}",
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.padding(vertical = 2.dp),
                    )
                }
            }

            Button(onClick = onAddTask, modifier = Modifier.padding(top = 16.dp)) {
                Text("+ Add task")
            }
        }
    }
}
