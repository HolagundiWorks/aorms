package com.aorms.mobile.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.aorms.mobile.data.TaskRow
import com.aorms.mobile.ui.tasks.NewTaskSheet

private data class Kpi(val label: String, val value: Long, val accent: Color)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TodayScreen(viewModel: TodayViewModel) {
    LaunchedEffect(Unit) { viewModel.load() }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(viewModel.error) {
        viewModel.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.error = null
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(onClick = { viewModel.showNewTask = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add task")
            }
        },
    ) { padding ->
        LazyColumn(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            item {
                Text("Today", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 16.dp))
                Text(
                    "What needs your attention right now.",
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 4.dp),
                )
            }

            if (viewModel.overdueTasks.isNotEmpty()) {
                item { SectionHeader("Overdue", warning = true) }
                items(viewModel.overdueTasks) { task ->
                    TaskAgendaRow(task, viewModel.projectTitle(task.projectId), onDone = { viewModel.markDone(task.id) })
                }
            }

            item { SectionHeader("Due today") }
            if (viewModel.todayTasks.isEmpty() && !viewModel.loading) {
                item {
                    Text(
                        "Nothing due today.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(vertical = 8.dp),
                    )
                }
            }
            items(viewModel.todayTasks) { task ->
                TaskAgendaRow(task, viewModel.projectTitle(task.projectId), onDone = { viewModel.markDone(task.id) })
            }

            if (viewModel.upcomingTasks.isNotEmpty()) {
                item { SectionHeader("Upcoming") }
                items(viewModel.upcomingTasks) { task ->
                    TaskAgendaRow(task, viewModel.projectTitle(task.projectId), onDone = { viewModel.markDone(task.id) })
                }
            }

            item {
                Text(
                    "Studio Pulse",
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 28.dp, bottom = 4.dp),
                )
                Text(
                    "Same six numbers as the web app's Pulse dashboard.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                PulseGrid(viewModel)
            }
        }
    }

    if (viewModel.showNewTask) {
        NewTaskSheet(
            projects = viewModel.projects,
            onDismiss = { viewModel.showNewTask = false },
            onCreate = { title, projectId, priority, dueDate -> viewModel.createTask(title, projectId, priority, dueDate) },
        )
    }
}

@Composable
private fun SectionHeader(label: String, warning: Boolean = false) {
    Text(
        label,
        style = MaterialTheme.typography.titleMedium,
        color = if (warning) Color(0xFFDA1E28) else MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.padding(top = 16.dp, bottom = 8.dp),
    )
}

@Composable
private fun TaskAgendaRow(task: TaskRow, projectTitle: String?, onDone: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(task.title, style = MaterialTheme.typography.titleSmall)
                Text(
                    listOfNotNull(projectTitle, task.priority, task.dueDate).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = onDone) {
                Icon(Icons.Default.Check, contentDescription = "Mark done")
            }
        }
    }
}

/** Same six tiles/colors as the old ui.dashboard.DashboardScreen — plain
 * Column-of-Rows, not LazyVerticalGrid, since this composable is itself
 * inside a LazyColumn item and a nested lazy grid there needs an
 * awkward fixed-height workaround this small, fixed 3x2 set doesn't need. */
@Composable
private fun PulseGrid(viewModel: TodayViewModel) {
    val kpis = listOf(
        Kpi("Critical", viewModel.critical, Color(0xFFDA1E28)),
        Kpi("Blocked tasks", viewModel.blocked, Color(0xFFFF832B)),
        Kpi("Open gaps", viewModel.openGaps, Color(0xFFF1C21B)),
        Kpi("Low confidence", viewModel.lowConfidence, Color(0xFFFF832B)),
        Kpi("Projects at risk", viewModel.projectsAtRisk, Color(0xFFDA1E28)),
        Kpi("Open revisions", viewModel.openRevisions, Color(0xFF0F62FE)),
    )
    Column(modifier = Modifier.padding(bottom = 24.dp)) {
        kpis.chunked(2).forEach { pair ->
            Row(modifier = Modifier.fillMaxWidth()) {
                pair.forEach { kpi ->
                    Card(
                        modifier = Modifier.fillMaxWidth(0.5f).padding(6.dp).aspectRatio(1.6f),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                    ) {
                        Column(
                            modifier = Modifier.fillMaxSize().padding(12.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Text(
                                if (viewModel.loading) "…" else kpi.value.toString(),
                                style = MaterialTheme.typography.headlineSmall,
                                color = kpi.accent,
                            )
                            Text(kpi.label, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}
