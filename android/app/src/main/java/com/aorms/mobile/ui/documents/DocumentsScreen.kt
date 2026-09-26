package com.aorms.mobile.ui.documents

import android.content.Intent
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.aorms.mobile.data.DocumentIssueRow
import com.aorms.mobile.ui.theme.CarbonTile

@Composable
fun DocumentsScreen(viewModel: DocumentsViewModel) {
    LaunchedEffect(Unit) { viewModel.load() }

    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(viewModel.error) {
        viewModel.error?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.error = null
        }
    }
    val context = LocalContext.current

    // No FAB — logging a new document issue is a creation/administer flow
    // that stays web-only (see DocumentsViewModel's own comment); this
    // screen is purely a consume-only view + share surface.
    Scaffold(snackbarHost = { SnackbarHost(snackbarHostState) }) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            if (viewModel.issues.isEmpty() && !viewModel.loading) {
                Text("No document issues logged yet.", modifier = Modifier.padding(24.dp))
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                items(viewModel.issues) { issue ->
                    DocumentIssueTile(
                        issue = issue,
                        onShare = {
                            val text = buildString {
                                append("${issue.entityType} ${issue.ref} (v${issue.versionNo})")
                                issue.projectOffices?.title?.let { append(" — $it") }
                                issue.issuedAt?.let { append("\nIssued: $it") }
                                issue.revisionNote?.let { append("\n$it") }
                                issue.impactNote?.let { append("\nImpact: $it") }
                            }
                            val intent = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(Intent.EXTRA_TEXT, text)
                            }
                            context.startActivity(Intent.createChooser(intent, "Share document issue"))
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun DocumentIssueTile(issue: DocumentIssueRow, onShare: () -> Unit) {
    CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "${issue.entityType} · ${issue.ref} · v${issue.versionNo}",
                    style = MaterialTheme.typography.titleSmall,
                )
                Text(
                    listOfNotNull(issue.projectOffices?.title, issue.issuedAt).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                issue.revisionNote?.let {
                    Text(it, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
                }
                issue.impactNote?.let {
                    Text(
                        "Impact: $it",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            IconButton(onClick = onShare) {
                Icon(Icons.Default.Share, contentDescription = "Share")
            }
        }
    }
}
