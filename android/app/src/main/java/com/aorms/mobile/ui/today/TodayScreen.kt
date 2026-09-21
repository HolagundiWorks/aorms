package com.aorms.mobile.ui.today

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
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
import com.aorms.mobile.ui.theme.CarbonTile

private data class Kpi(val key: String, val label: String, val value: Long, val accent: Color)

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
            // Carbon has no floating-action-button pattern at all (it's a
            // desktop/web design system) — the nearest Carbon-styled
            // equivalent this session settled on is a flat, square,
            // zero-elevation primary-colored button in the FAB's usual
            // position, not a literal Carbon component (none exists).
            FloatingActionButton(
                onClick = { viewModel.showNewTask = true },
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp, pressedElevation = 0.dp, focusedElevation = 0.dp, hoveredElevation = 0.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add task")
            }
        },
    ) { padding ->
        // Extra bottom content padding (2026-09-20 fix, real bug found live
        // on device: the floating "+" button visually overlapped and
        // obscured the last row of an expanded KPI detail panel — a FAB
        // floats over scrollable content by design, Scaffold's own
        // `padding` doesn't reserve clearance for it, so the content itself
        // has to leave room.
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            contentPadding = PaddingValues(bottom = 88.dp),
        ) {
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
                    "Same six numbers as the web app's Pulse dashboard — tap a tile for detail.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                PulseGrid(viewModel)
                if (viewModel.expandedKpi != null) {
                    KpiDetailPanel(
                        label = KPI_LABELS[viewModel.expandedKpi] ?: "",
                        loading = viewModel.kpiDetailLoading,
                        rows = viewModel.kpiDetailRows,
                    )
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
    CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
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

private val KPI_LABELS = mapOf(
    "critical" to "Critical",
    "blocked" to "Blocked tasks",
    "openGaps" to "Open gaps",
    "lowConfidence" to "Low confidence",
    "projectsAtRisk" to "Projects at risk",
    "openRevisions" to "Open revisions",
)

/** Same six tiles/colors as the old ui.dashboard.DashboardScreen — plain
 * Column-of-Rows, not LazyVerticalGrid, since this composable is itself
 * inside a LazyColumn item and a nested lazy grid there needs an
 * awkward fixed-height workaround this small, fixed 3x2 set doesn't need.
 * Each tile is clickable (2026-09-20, explicit user request: "on clicking
 * kpi tiles expand and show detail") — toggles TodayViewModel.expandedKpi,
 * rendered as a single shared detail panel below the whole grid rather
 * than inline per-tile, so tapping a tile never reflows the grid itself.
 *
 * Explicit `BoxWithConstraints` + `Modifier.width(tileWidth)` (2026-09-20
 * fix, real UI bug found live on device: "kpi tiles are of different
 * sizes") — the previous `Modifier.fillMaxWidth(0.5f)` on each tile
 * looked correct in isolation but was wrong for a `Row`'s *second*
 * non-weighted child: Compose passes each subsequent unweighted child the
 * *remaining* width after earlier siblings, not the Row's own full width,
 * so the two 0.5f calls compounded (0.5, then 0.5-of-the-remaining-0.5 =
 * 0.25) instead of splitting evenly — confirmed by measuring the actual
 * rendered tile widths in a device screenshot, not just reasoned about.
 * `Modifier.weight(1f)` is the normal fix for exactly this, but hits a
 * separate, already-documented Kotlin/Compose-BOM version-mismatch
 * compiler bug in this project (see the commit that first worked around
 * it) — computing an explicit `Dp` width up front sidesteps both issues
 * without touching the project's pinned dependency versions.
 *
 * Fixed `Modifier.height(TILE_HEIGHT)` instead of `Modifier.aspectRatio(1.6f)`
 * (2026-09-21 fix, real bug found live on device: in landscape the FAB
 * covered the "Blocked tasks" tile's expand chevron). Root cause: an
 * aspect-ratio-derived height scales with tile *width*, and landscape's
 * much wider `tileWidth` (half the screen width, which is now the long
 * edge) blew the first row's tile height up to ~2x its portrait size —
 * tall enough that the first KPI row extended into the FAB's fixed
 * bottom-right position within this screen's own (short, landscape)
 * content area, without needing to scroll. A fixed height is independent
 * of width, so it doesn't balloon in landscape, and it keeps portrait's
 * existing look (chosen close to portrait's old aspect-ratio-derived
 * height). */
private val TILE_HEIGHT = 112.dp

@Composable
private fun PulseGrid(viewModel: TodayViewModel) {
    val kpis = listOf(
        Kpi("critical", "Critical", viewModel.critical, Color(0xFFDA1E28)),
        Kpi("blocked", "Blocked tasks", viewModel.blocked, Color(0xFFFF832B)),
        Kpi("openGaps", "Open gaps", viewModel.openGaps, Color(0xFFF1C21B)),
        Kpi("lowConfidence", "Low confidence", viewModel.lowConfidence, Color(0xFFFF832B)),
        Kpi("projectsAtRisk", "Projects at risk", viewModel.projectsAtRisk, Color(0xFFDA1E28)),
        Kpi("openRevisions", "Open revisions", viewModel.openRevisions, Color(0xFF0F62FE)),
    )
    BoxWithConstraints(modifier = Modifier.padding(bottom = 8.dp)) {
        val gap = 12.dp
        val tileWidth = (maxWidth - gap) / 2
        Column {
            kpis.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(gap)) {
                    pair.forEach { kpi ->
                        val selected = viewModel.expandedKpi == kpi.key
                        CarbonTile(
                            modifier = Modifier
                                .width(tileWidth)
                                .padding(vertical = 6.dp)
                                .height(TILE_HEIGHT)
                                .clickable { viewModel.toggleKpi(kpi.key) },
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                            border = if (selected) BorderStroke(2.dp, kpi.accent) else BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize().padding(12.dp),
                                verticalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text(
                                        if (viewModel.loading) "…" else kpi.value.toString(),
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = kpi.accent,
                                    )
                                    Icon(
                                        if (selected) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                                        contentDescription = if (selected) "Collapse" else "Expand",
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(18.dp),
                                    )
                                }
                                Text(kpi.label, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun KpiDetailPanel(label: String, loading: Boolean, rows: List<KpiDetailRow>) {
    CarbonTile(modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label, style = MaterialTheme.typography.titleSmall, modifier = Modifier.padding(bottom = 8.dp))
            when {
                loading -> CircularProgressIndicator(modifier = Modifier.size(20.dp).padding(vertical = 8.dp))
                rows.isEmpty() -> Text(
                    "Nothing here right now.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                else -> rows.forEach { row ->
                    Column(modifier = Modifier.padding(vertical = 6.dp)) {
                        Text(row.primary, style = MaterialTheme.typography.bodyMedium)
                        row.secondary?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}
