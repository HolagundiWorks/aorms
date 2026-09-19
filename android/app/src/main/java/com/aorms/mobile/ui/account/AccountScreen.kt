package com.aorms.mobile.ui.account

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
fun AccountScreen(viewModel: AccountViewModel) {
    LaunchedEffect(Unit) { viewModel.load() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("Account", style = MaterialTheme.typography.titleLarge)
        Spacer(modifier = Modifier.height(16.dp))

        Card(modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(viewModel.profile?.fullName?.ifBlank { viewModel.email } ?: viewModel.email, style = MaterialTheme.typography.titleMedium)
                Text(viewModel.email, style = MaterialTheme.typography.bodyMedium)
                viewModel.profile?.role?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
        Text("Your studios", style = MaterialTheme.typography.titleMedium)
        Text(
            "Switch which firm's data you're working in.",
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(bottom = 8.dp),
        )

        if (viewModel.loading) {
            CircularProgressIndicator(modifier = Modifier.padding(top = 16.dp))
        }

        viewModel.firms.forEach { membership ->
            val isActive = membership.firmId == viewModel.profile?.firmId
            Card(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = androidx.compose.foundation.layout.Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            membership.firms?.companyName ?: "Untitled firm",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                        )
                        Text(membership.role, style = MaterialTheme.typography.bodySmall)
                    }
                    if (isActive) {
                        Text("Active", color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                    } else {
                        OutlinedButton(onClick = { viewModel.switchFirm(membership.firmId) }, enabled = !viewModel.switching) {
                            Text("Switch")
                        }
                    }
                }
            }
        }

        viewModel.error?.let {
            Text(it, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 12.dp))
        }

        Spacer(modifier = Modifier.height(32.dp))
        HorizontalDivider()
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = { viewModel.signOut() },
            colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Sign out")
        }
    }
}
