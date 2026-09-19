package com.aorms.mobile.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private data class Kpi(val label: String, val value: Long, val accent: Color)

@Composable
fun DashboardScreen(viewModel: DashboardViewModel) {
    LaunchedEffect(Unit) { viewModel.load() }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Good day, ${viewModel.userName.substringBefore('@')}", style = MaterialTheme.typography.titleLarge)
        Text(
            "Here's what needs attention today.",
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(bottom = 20.dp),
        )

        val kpis = listOf(
            Kpi("My open tasks", viewModel.myOpenTasks, Color(0xFF0F62FE)),
            Kpi("Open leads", viewModel.openLeads, Color(0xFF24A148)),
            Kpi("Open snags", viewModel.openSnags, Color(0xFFDA1E28)),
        )

        LazyVerticalGrid(columns = GridCells.Fixed(2), modifier = Modifier.fillMaxWidth()) {
            items(kpis) { kpi ->
                Card(
                    modifier = Modifier.padding(6.dp).aspectRatio(1.3f),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(
                            if (viewModel.loading) "…" else kpi.value.toString(),
                            style = MaterialTheme.typography.displaySmall,
                            color = kpi.accent,
                        )
                        Text(kpi.label, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }
    }
}
