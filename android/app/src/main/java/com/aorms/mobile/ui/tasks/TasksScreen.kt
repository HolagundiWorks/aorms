package com.aorms.mobile.ui.tasks

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.unit.dp
import com.aorms.mobile.data.ProjectOption
import com.aorms.mobile.ui.theme.CarbonTile

private val PRIORITIES = listOf("LOW", "MEDIUM", "HIGH", "CRITICAL")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TasksScreen(viewModel: TasksViewModel) {
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
            FloatingActionButton(
                onClick = { viewModel.showNewTask = true },
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp, pressedElevation = 0.dp, focusedElevation = 0.dp, hoveredElevation = 0.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = "New task")
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            if (viewModel.tasks.isEmpty() && !viewModel.loading) {
                Text("No tasks assigned to you.", modifier = Modifier.padding(24.dp))
            }
            // Bottom contentPadding (2026-09-20 UI-audit fix) — same FAB-
            // overlaps-last-item issue found and fixed on the Today screen.
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(12.dp),
                contentPadding = PaddingValues(bottom = 80.dp),
            ) {
                items(viewModel.tasks) { task ->
                    CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(task.title, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${task.priority} · ${task.status}${task.dueDate?.let { " · due $it" } ?: ""}",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            if (task.status != "DONE") {
                                Button(
                                    onClick = { viewModel.markDone(task.id) },
                                    modifier = Modifier.padding(top = 8.dp),
                                ) {
                                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.padding(end = 4.dp))
                                    Text("Mark done")
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (viewModel.showNewTask) {
        NewTaskSheet(
            projects = viewModel.projects,
            error = viewModel.error,
            onDismiss = { viewModel.showNewTask = false; viewModel.error = null },
            onCreate = { title, projectId, priority, dueDate -> viewModel.createTask(title, projectId, priority, dueDate) },
        )
    }
}

/** Shared with ui.today.TodayScreen's own "+ Add task" quick action — same create-task form, one definition.
 *
 * [error] renders INSIDE this sheet's own Column, not via the parent Scaffold's
 * SnackbarHost (2026-09-21 fix, real bug found live on device): a `ModalBottomSheet`
 * renders in its own separate window/surface above the Scaffold, so a Snackbar
 * hosted in the Scaffold is always covered and invisible while the sheet is open. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewTaskSheet(
    projects: List<ProjectOption>,
    error: String? = null,
    // Pre-selects the project picker (2026-09-25, mobile Projects view's
    // "+ Add task" action, launched from a specific project's own detail
    // panel) — defaults to null so Today/Tasks' own call sites, which have
    // no project context to pre-fill from, are unaffected.
    initialProject: ProjectOption? = null,
    onDismiss: () -> Unit,
    onCreate: (String, String?, String, String?) -> Unit,
) {
    var title by remember { mutableStateOf("") }
    var priority by remember { mutableStateOf("MEDIUM") }
    var dueDate by remember { mutableStateOf("") }
    var projectExpanded by remember { mutableStateOf(false) }
    var selectedProject by remember { mutableStateOf(initialProject) }
    var priorityExpanded by remember { mutableStateOf(false) }

    // Carbon has no rounded edges — Material3's ModalBottomSheet default
    // shape isn't reached by the theme's Shapes override (2026-09-20
    // UI-audit fix).
    ModalBottomSheet(onDismissRequest = onDismiss, shape = RectangleShape) {
        Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
            Text("New task", style = MaterialTheme.typography.titleLarge)
            error?.let {
                Text(
                    it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
            ExposedDropdownMenuBox(
                expanded = projectExpanded,
                onExpandedChange = { projectExpanded = it },
                modifier = Modifier.padding(top = 12.dp),
            ) {
                OutlinedTextField(
                    value = selectedProject?.title ?: "No project",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Project") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = projectExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                )
                ExposedDropdownMenu(expanded = projectExpanded, onDismissRequest = { projectExpanded = false }) {
                    projects.forEach { p ->
                        DropdownMenuItem(
                            text = { Text(p.title) },
                            onClick = { selectedProject = p; projectExpanded = false },
                        )
                    }
                }
            }
            ExposedDropdownMenuBox(
                expanded = priorityExpanded,
                onExpandedChange = { priorityExpanded = it },
                modifier = Modifier.padding(top = 12.dp),
            ) {
                OutlinedTextField(
                    value = priority,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Priority") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = priorityExpanded) },
                    modifier = Modifier.menuAnchor().fillMaxWidth(),
                )
                ExposedDropdownMenu(expanded = priorityExpanded, onDismissRequest = { priorityExpanded = false }) {
                    PRIORITIES.forEach { p ->
                        DropdownMenuItem(text = { Text(p) }, onClick = { priority = p; priorityExpanded = false })
                    }
                }
            }
            OutlinedTextField(
                value = dueDate,
                onValueChange = { dueDate = it },
                label = { Text("Due date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )
            Button(
                onClick = { onCreate(title, selectedProject?.id, priority, dueDate.ifBlank { null }) },
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 24.dp),
            ) {
                Text("Create task")
            }
        }
    }
}
