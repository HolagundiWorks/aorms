package com.aorms.mobile.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CheckCircleOutline
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.aorms.mobile.data.Supa
import com.aorms.mobile.ui.account.AccountScreen
import com.aorms.mobile.ui.approvals.ApprovalsScreen
import com.aorms.mobile.ui.approvals.ApprovalsViewModel
import com.aorms.mobile.ui.documents.DocumentsScreen
import com.aorms.mobile.ui.documents.DocumentsViewModel
import com.aorms.mobile.ui.account.AccountViewModel
import com.aorms.mobile.ui.auth.AuthScreen
import com.aorms.mobile.ui.auth.AuthViewModel
import com.aorms.mobile.ui.today.TodayScreen
import com.aorms.mobile.ui.today.TodayViewModel
import com.aorms.mobile.ui.leads.LeadsScreen
import com.aorms.mobile.ui.leads.LeadsViewModel
import com.aorms.mobile.ui.projects.ProjectsScreen
import com.aorms.mobile.ui.projects.ProjectsViewModel
import com.aorms.mobile.ui.sitereports.SiteReportsScreen
import com.aorms.mobile.ui.sitereports.SiteReportsViewModel
import com.aorms.mobile.ui.tasks.TasksScreen
import com.aorms.mobile.ui.tasks.TasksViewModel
import io.github.jan.supabase.auth.status.SessionStatus

private data class BottomDest(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val BOTTOM_DESTS = listOf(
    BottomDest("today", "Today", Icons.Default.CheckCircle),
    BottomDest("projects", "Projects", Icons.Default.Folder),
    BottomDest("tasks", "Tasks", Icons.AutoMirrored.Filled.Assignment),
    // "Approvals" wraps to two lines in the bottom nav once a 7th item
    // pushes every item's available width down (2026-09-25 UI fix, found
    // live on device) — "Approve" is the same length as "Account", which
    // renders fine at this width, so it was the shortest label that still
    // reads clearly rather than an unrelated abbreviation.
    BottomDest("approvals", "Approve", Icons.Default.CheckCircleOutline),
    BottomDest("leads", "Leads", Icons.Default.PersonAdd),
    // Short label, not "Documents" (2026-09-25's "Approve" wrapping fix
    // already found the pattern: adding another item shrinks every item's
    // available width, and a longer label is what breaks first).
    BottomDest("documents", "Docs", Icons.Default.Description),
    BottomDest("reports", "Site", Icons.Default.Warning),
    BottomDest("account", "Account", Icons.Default.AccountCircle),
)

@Composable
fun AormsApp() {
    val authViewModel: AuthViewModel = viewModel()
    val sessionStatus by authViewModel.sessionStatus.collectAsState()

    // 2026-09-27 fix, root-caused live on device: launching an external
    // Activity (confirmed via the Site Inspections camera capture, but
    // this applies to any app resume) reliably discarded the whole
    // AuthenticatedApp() subtree — its NavController's back stack and
    // every nav-scoped ViewModel — even though the process/Activity
    // itself never died (confirmed via lifecycle logging: same PID, no
    // onCreate/onDestroy at all). Root cause: Supabase Auth's own
    // sessionStatus flow re-emits SessionStatus.Initializing while it
    // re-validates the stored session on resume, and the old `when`
    // below treated anything that wasn't literally Authenticated as
    // "log the user out," tearing down and rebuilding AuthenticatedApp()
    // from scratch on every such blip. `hasAuthenticated` remembers a
    // real prior Authenticated result across a transient Initializing
    // tick, so only a genuine NotAuthenticated/RefreshFailure (an actual
    // sign-out or expired session) bounces to the login screen.
    var hasAuthenticated by remember { mutableStateOf(false) }
    LaunchedEffect(sessionStatus) {
        when (sessionStatus) {
            is SessionStatus.Authenticated -> hasAuthenticated = true
            is SessionStatus.NotAuthenticated, is SessionStatus.RefreshFailure -> hasAuthenticated = false
            is SessionStatus.Initializing -> Unit // keep whatever hasAuthenticated already was
        }
    }

    if (sessionStatus is SessionStatus.Authenticated || (hasAuthenticated && sessionStatus is SessionStatus.Initializing)) {
        AuthenticatedApp()
    } else {
        AuthScreen(authViewModel)
    }
}

@Composable
private fun AuthenticatedApp() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            // Carbon separates surfaces with a flat 1px border, not a
            // tonal-elevation tint (Material3's NavigationBar default) —
            // zeroed tonalElevation + an explicit top divider instead.
            Column {
                HorizontalDivider(color = MaterialTheme.colorScheme.outline)
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface, tonalElevation = 0.dp) {
                    val backStackEntry by navController.currentBackStackEntryAsState()
                    val currentDestination = backStackEntry?.destination
                    BOTTOM_DESTS.forEach { dest ->
                        val selected = currentDestination?.hierarchy?.any { it.route == dest.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(dest.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(dest.icon, contentDescription = dest.label) },
                            label = { Text(dest.label) },
                            // 2026-09-26 fix, found live on device: 8 flat
                            // items is past the point where shortening one
                            // more label helps — "Projects"/"Approve"/
                            // "Account" all wrapped to two lines at this
                            // width, not just the newest addition. Material3's
                            // standard fix for a many-item bar: only the
                            // selected tab shows its label; others are
                            // icon-only, which is what frees the width every
                            // label actually needs.
                            alwaysShowLabel = selected,
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(navController = navController, startDestination = "today", modifier = Modifier.padding(padding)) {
            composable("today") { TodayScreen(viewModel<TodayViewModel>()) }
            composable("projects") { ProjectsScreen(viewModel<ProjectsViewModel>()) }
            composable("tasks") { TasksScreen(viewModel<TasksViewModel>()) }
            composable("approvals") { ApprovalsScreen(viewModel<ApprovalsViewModel>()) }
            composable("leads") { LeadsScreen(viewModel<LeadsViewModel>()) }
            composable("documents") { DocumentsScreen(viewModel<DocumentsViewModel>()) }
            composable("reports") { SiteReportsScreen(viewModel<SiteReportsViewModel>()) }
            composable("account") { AccountScreen(viewModel<AccountViewModel>()) }
        }
    }
}
