package com.aorms.mobile.ui.sitereports

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.aorms.mobile.data.ProjectOption
import java.io.File

/**
 * Site Inspections capture (2026-09-26) — the app's first camera use.
 * Separate composable from NewSiteReportSheet (Progress/Snags/
 * Instructions' shared sheet): those are plain Postgrest inserts,
 * this uploads real photo bytes over HTTP via Repository.
 * uploadSiteInspection(), a genuinely different shape that doesn't fit
 * that composable's existing `when(tab)` branches.
 *
 * Photos are captured to the app's own cache dir (createTempPhotoFile)
 * and shared with the system camera app via FileProvider — a bare
 * file:// Uri is blocked (FileUriExposedException) on API 24+.
 *
 * **All fields use `rememberSaveable`, not plain `remember`** — found live
 * on device, not theoretical: launching the system camera Activity
 * reliably got this app's process killed by Android under memory
 * pressure while the camera app was foregrounded (confirmed reproducible
 * on every attempt, not a one-off — `always_finish_activities` was off,
 * so this wasn't a "don't keep activities" dev-option artifact, just
 * ordinary background-process reclaim). With plain `remember`, returning
 * from the camera silently reset the whole app to its start destination,
 * discarding the project/summary/checkboxes and any already-captured
 * photos — the underlying photo *file* was still safely written to disk
 * by the camera, just orphaned from the UI that would have referenced
 * it. `rememberSaveable` persists through exactly this (process death,
 * not just configuration change) via the Activity's own SavedStateRegistry,
 * which is what it's for. `File`/`ProjectOption` aren't natively
 * saveable, so they're represented here as plain Strings (a file path, a
 * project id) and reconstructed on read — simpler and more certainly
 * correct than writing custom `Saver`s for two small types.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NewInspectionSheet(
    projects: List<ProjectOption>,
    error: String? = null,
    submitting: Boolean,
    onDismiss: () -> Unit,
    onSubmit: (
        projectId: String,
        summary: String,
        issuesFound: Boolean,
        followUpRequired: Boolean,
        followUpNotes: String?,
        photos: List<File>,
    ) -> Unit,
) {
    val context = LocalContext.current

    var projectExpanded by remember { mutableStateOf(false) }
    var selectedProjectId by rememberSaveable { mutableStateOf("") }
    val selectedProject = projects.firstOrNull { it.id == selectedProjectId }
    var summary by rememberSaveable { mutableStateOf("") }
    var issuesFound by rememberSaveable { mutableStateOf(false) }
    var followUpRequired by rememberSaveable { mutableStateOf(false) }
    var followUpNotes by rememberSaveable { mutableStateOf("") }
    // Photo paths joined into one string ("\n"-separated) rather than a
    // List<String> — sidesteps any doubt about whether Compose's default
    // Saver handles a List<String> on this Compose/AndroidX version, using
    // only plain-String saveability, which is unambiguous.
    var photoPathsJoined by rememberSaveable { mutableStateOf("") }
    val photos = remember(photoPathsJoined) {
        if (photoPathsJoined.isBlank()) emptyList() else photoPathsJoined.split("\n").map { File(it) }
    }
    var pendingPhotoPath by rememberSaveable { mutableStateOf("") }

    val cameraLauncher = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        val path = pendingPhotoPath
        if (success && path.isNotBlank()) {
            photoPathsJoined = if (photoPathsJoined.isBlank()) path else "$photoPathsJoined\n$path"
        } else if (path.isNotBlank()) {
            File(path).delete()
        }
        pendingPhotoPath = ""
    }

    fun launchCamera() {
        val file = File.createTempFile("inspection_${System.currentTimeMillis()}_", ".jpg", context.cacheDir)
        pendingPhotoPath = file.absolutePath
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        cameraLauncher.launch(uri)
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) launchCamera()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, shape = RectangleShape) {
        Column(modifier = Modifier.padding(20.dp).fillMaxWidth()) {
            Text("New site inspection", style = MaterialTheme.typography.titleLarge)
            error?.let {
                Text(
                    it,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 8.dp),
                )
            }

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
                            onClick = { selectedProjectId = p.id; projectExpanded = false },
                        )
                    }
                }
            }

            OutlinedTextField(
                value = summary,
                onValueChange = { summary = it },
                label = { Text("Summary") },
                modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
            )

            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(checked = issuesFound, onCheckedChange = { issuesFound = it })
                Text("Issues found", style = MaterialTheme.typography.bodyMedium)
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(checked = followUpRequired, onCheckedChange = { followUpRequired = it })
                Text("Follow-up required", style = MaterialTheme.typography.bodyMedium)
            }
            if (followUpRequired) {
                OutlinedTextField(
                    value = followUpNotes,
                    onValueChange = { followUpNotes = it },
                    label = { Text("Follow-up notes") },
                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                )
            }

            OutlinedButton(
                onClick = {
                    if (ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                        launchCamera()
                    } else {
                        permissionLauncher.launch(Manifest.permission.CAMERA)
                    }
                },
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
            ) {
                Icon(Icons.Default.PhotoCamera, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text(if (photos.isEmpty()) "Take photo" else "Take another photo")
            }

            if (photos.isNotEmpty()) {
                Text(
                    "${photos.size} photo${if (photos.size == 1) "" else "s"} attached",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 8.dp),
                )
                photos.forEachIndexed { index, file ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(file.name, style = MaterialTheme.typography.bodySmall)
                        IconButton(onClick = {
                            file.delete()
                            photoPathsJoined = photos.filterIndexed { i, _ -> i != index }.joinToString("\n") { it.absolutePath }
                        }) {
                            Icon(Icons.Default.Close, contentDescription = "Remove photo")
                        }
                    }
                }
            }

            Button(
                onClick = {
                    onSubmit(
                        selectedProject?.id ?: "",
                        summary,
                        issuesFound,
                        followUpRequired,
                        followUpNotes.ifBlank { null },
                        photos,
                    )
                },
                enabled = !submitting,
                modifier = Modifier.fillMaxWidth().padding(top = 20.dp, bottom = 24.dp),
            ) {
                if (submitting) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = MaterialTheme.colorScheme.onPrimary)
                } else {
                    Text("Submit inspection")
                }
            }
        }
    }
}
