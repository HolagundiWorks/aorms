package com.aorms.mobile.ui.approvals

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.aorms.mobile.data.ApprovalRow
import com.aorms.mobile.ui.theme.CarbonTile

@Composable
fun ApprovalsScreen(viewModel: ApprovalsViewModel) {
    LaunchedEffect(Unit) { viewModel.load() }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(viewModel.error) {
        viewModel.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.error = null
        }
    }

    // No FAB — logging a new approval-for-sign-off record is a creation/
    // administer flow that stays web-only (see ApprovalsViewModel's own
    // comment); this screen is purely a one-tap response surface.
    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            if (viewModel.approvals.isEmpty() && !viewModel.loading) {
                Text("No approvals logged yet.", modifier = Modifier.padding(24.dp))
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(viewModel.approvals) { approval ->
                    ApprovalTile(approval = approval, onRespond = { status -> viewModel.respond(approval.id, status) })
                }
            }
        }
    }
}

@Composable
private fun ApprovalTile(approval: ApprovalRow, onRespond: (String) -> Unit) {
    CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(approval.title, style = MaterialTheme.typography.titleMedium)
            Text(
                listOfNotNull(approval.projectOffices?.title, approval.entityType, approval.recipient, approval.channel)
                    .joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "${approval.status}${approval.sentDate?.let { " · sent $it" } ?: ""}",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp),
            )
            // One-tap response — only for items still awaiting a response.
            // Anything already resolved (APPROVED/REVISIONS/REJECTED/
            // SUPERSEDED) or not yet sent (DRAFT) has no action here; DRAFT
            // specifically stays web-only (sending it is part of the
            // creation flow this screen deliberately doesn't own).
            if (approval.status == "SENT") {
                Row(modifier = Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = { onRespond("APPROVED") }) { Text("Approve") }
                    Button(
                        onClick = { onRespond("REVISIONS") },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary),
                    ) { Text("Revisions") }
                    Button(
                        onClick = { onRespond("REJECTED") },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    ) { Text("Reject") }
                }
            }
        }
    }
}
