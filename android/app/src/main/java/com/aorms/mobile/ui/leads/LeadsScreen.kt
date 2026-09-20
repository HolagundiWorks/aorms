package com.aorms.mobile.ui.leads

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
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.ui.unit.dp
import com.aorms.mobile.ui.theme.CarbonTile

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeadsScreen(viewModel: LeadsViewModel) {
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
                onClick = { viewModel.showNewLead = true },
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 0.dp, pressedElevation = 0.dp, focusedElevation = 0.dp, hoveredElevation = 0.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = "New lead")
            }
        },
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            if (viewModel.leads.isEmpty() && !viewModel.loading) {
                Text("No leads yet.", modifier = Modifier.padding(24.dp))
            }
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(12.dp),
                contentPadding = PaddingValues(bottom = 80.dp),
            ) {
                items(viewModel.leads) { lead ->
                    CarbonTile(modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(lead.clientName, style = MaterialTheme.typography.titleMedium)
                            Text(
                                "${lead.ref} · ${lead.leadSource}${lead.city?.let { " · $it" } ?: ""} · ${lead.status}",
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
            }
        }
    }

    if (viewModel.showNewLead) {
        NewLeadSheet(
            onDismiss = { viewModel.showNewLead = false },
            onCreate = { name, source, city, phone -> viewModel.createLead(name, source, city, phone) },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun NewLeadSheet(
    onDismiss: () -> Unit,
    onCreate: (String, String, String?, String?) -> Unit,
) {
    var clientName by remember { mutableStateOf("") }
    var leadSource by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
            Text("New lead", style = MaterialTheme.typography.titleLarge)
            OutlinedTextField(
                value = clientName,
                onValueChange = { clientName = it },
                label = { Text("Client name") },
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            )
            OutlinedTextField(
                value = leadSource,
                onValueChange = { leadSource = it },
                label = { Text("Lead source (e.g. Referral, Website)") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )
            OutlinedTextField(
                value = city,
                onValueChange = { city = it },
                label = { Text("City") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )
            Button(
                onClick = { onCreate(clientName, leadSource, city.ifBlank { null }, phone.ifBlank { null }) },
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 24.dp),
            ) {
                Text("Create lead")
            }
        }
    }
}
