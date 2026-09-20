package com.aorms.mobile.ui.sitereports

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
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
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aorms.mobile.data.ProjectOption
import com.aorms.mobile.ui.theme.CarbonTile

private val TABS = listOf("Progress", "Snags", "Instructions")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SiteReportsScreen(viewModel: SiteReportsViewModel) {
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
                onClick = { viewModel.showNewSheet = true },
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp, pressedElevation = 0.dp, focusedElevation = 0.dp, hoveredElevation = 0.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = "New site report")
            }
        },
    ) { padding ->
        Column(modifier = Modifier.padding(padding).fillMaxSize()) {
            TabRow(selectedTabIndex = viewModel.tab) {
                TABS.forEachIndexed { i, label ->
                    Tab(selected = viewModel.tab == i, onClick = { viewModel.tab = i }, text = { Text(label) })
                }
            }
            Box(modifier = Modifier.fillMaxSize()) {
                when (viewModel.tab) {
                    0 -> LazyColumn(modifier = Modifier.padding(12.dp)) {
                        items(viewModel.progressReports) { r ->
                            CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text("${r.periodStart} — ${r.periodEnd}", style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        "${r.physicalProgressPct ?: 0}% physical · ${r.status}",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                    r.narrative?.let { Text(it, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp)) }
                                }
                            }
                        }
                    }
                    1 -> LazyColumn(modifier = Modifier.padding(12.dp)) {
                        items(viewModel.snags) { s ->
                            CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(s.ref, style = MaterialTheme.typography.titleMedium)
                                    Text(s.description, style = MaterialTheme.typography.bodyMedium)
                                    Text(
                                        "${s.location ?: "—"} · ${s.trade ?: "—"} · ${s.status}",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                }
                            }
                        }
                    }
                    else -> LazyColumn(modifier = Modifier.padding(12.dp)) {
                        items(viewModel.instructions) { s ->
                            CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(s.subject, style = MaterialTheme.typography.titleMedium)
                                    Text(s.ref, style = MaterialTheme.typography.bodySmall)
                                    s.body?.let { Text(it, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp)) }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (viewModel.showNewSheet) {
        NewSiteReportSheet(
            tab = viewModel.tab,
            projects = viewModel.projects,
            onDismiss = { viewModel.showNewSheet = false },
            onCreateProgress = { pid, start, end, narrative, pct -> viewModel.createProgressReport(pid, start, end, narrative, pct) },
            onCreateSnag = { pid, loc, trade, desc -> viewModel.createSnag(pid, loc, trade, desc) },
            onCreateInstruction = { pid, subject, body -> viewModel.createInstruction(pid, subject, body) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewSiteReportSheet(
    tab: Int,
    projects: List<ProjectOption>,
    onDismiss: () -> Unit,
    onCreateProgress: (String, String, String, String?, Int?) -> Unit,
    onCreateSnag: (String, String?, String?, String) -> Unit,
    onCreateInstruction: (String, String, String?) -> Unit,
) {
    var projectExpanded by remember { mutableStateOf(false) }
    var selectedProject by remember { mutableStateOf<ProjectOption?>(null) }

    var periodStart by remember { mutableStateOf("") }
    var periodEnd by remember { mutableStateOf("") }
    var narrative by remember { mutableStateOf("") }
    var pct by remember { mutableStateOf("") }

    var location by remember { mutableStateOf("") }
    var trade by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    var subject by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
            val sheetTitle = when (tab) {
                0 -> "New progress report"
                1 -> "New snag"
                else -> "New site instruction"
            }
            Text(sheetTitle, style = MaterialTheme.typography.titleLarge)

            ExposedDropdownMenuBox(
                expanded = projectExpanded,
                onExpandedChange = { projectExpanded = it },
                modifier = Modifier.padding(top = 16.dp),
            ) {
                OutlinedTextField(
                    value = selectedProject?.title ?: "Select a project",
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

            when (tab) {
                0 -> {
                    OutlinedTextField(periodStart, { periodStart = it }, label = { Text("Period start (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    OutlinedTextField(periodEnd, { periodEnd = it }, label = { Text("Period end (YYYY-MM-DD)") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    OutlinedTextField(pct, { pct = it }, label = { Text("Physical progress %") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    OutlinedTextField(narrative, { narrative = it }, label = { Text("Narrative") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    Button(
                        onClick = {
                            selectedProject?.let {
                                onCreateProgress(it.id, periodStart, periodEnd, narrative.ifBlank { null }, pct.toIntOrNull())
                            }
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 24.dp),
                    ) { Text("Create progress report") }
                }
                1 -> {
                    OutlinedTextField(location, { location = it }, label = { Text("Location") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    OutlinedTextField(trade, { trade = it }, label = { Text("Trade") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    OutlinedTextField(description, { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    Button(
                        onClick = { selectedProject?.let { onCreateSnag(it.id, location.ifBlank { null }, trade.ifBlank { null }, description) } },
                        modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 24.dp),
                    ) { Text("Log snag") }
                }
                else -> {
                    OutlinedTextField(subject, { subject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    OutlinedTextField(body, { body = it }, label = { Text("Instruction") }, modifier = Modifier.fillMaxWidth().padding(top = 12.dp))
                    Button(
                        onClick = { selectedProject?.let { onCreateInstruction(it.id, subject, body.ifBlank { null }) } },
                        modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 24.dp),
                    ) { Text("Issue instruction") }
                }
            }
        }
    }
}
