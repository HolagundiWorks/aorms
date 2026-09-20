package com.aorms.mobile.ui

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
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
import com.aorms.mobile.ui.account.AccountViewModel
import com.aorms.mobile.ui.auth.AuthScreen
import com.aorms.mobile.ui.auth.AuthViewModel
import com.aorms.mobile.ui.today.TodayScreen
import com.aorms.mobile.ui.today.TodayViewModel
import com.aorms.mobile.ui.leads.LeadsScreen
import com.aorms.mobile.ui.leads.LeadsViewModel
import com.aorms.mobile.ui.sitereports.SiteReportsScreen
import com.aorms.mobile.ui.sitereports.SiteReportsViewModel
import com.aorms.mobile.ui.tasks.TasksScreen
import com.aorms.mobile.ui.tasks.TasksViewModel
import io.github.jan.supabase.auth.status.SessionStatus

private data class BottomDest(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val BOTTOM_DESTS = listOf(
    BottomDest("today", "Today", Icons.Default.CheckCircle),
    BottomDest("tasks", "Tasks", Icons.AutoMirrored.Filled.Assignment),
    BottomDest("leads", "Leads", Icons.Default.PersonAdd),
    BottomDest("reports", "Site", Icons.Default.Warning),
    BottomDest("account", "Account", Icons.Default.AccountCircle),
)

@Composable
fun AormsApp() {
    val authViewModel: AuthViewModel = viewModel()
    val sessionStatus by authViewModel.sessionStatus.collectAsState()

    when (sessionStatus) {
        is SessionStatus.Authenticated -> AuthenticatedApp()
        else -> AuthScreen(authViewModel)
    }
}

@Composable
private fun AuthenticatedApp() {
    val navController = rememberNavController()

    Scaffold(
        bottomBar = {
            NavigationBar {
                val backStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = backStackEntry?.destination
                BOTTOM_DESTS.forEach { dest ->
                    NavigationBarItem(
                        selected = currentDestination?.hierarchy?.any { it.route == dest.route } == true,
                        onClick = {
                            navController.navigate(dest.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(dest.icon, contentDescription = dest.label) },
                        label = { Text(dest.label) },
                    )
                }
            }
        },
    ) { padding ->
        NavHost(navController = navController, startDestination = "today", modifier = Modifier.padding(padding)) {
            composable("today") { TodayScreen(viewModel<TodayViewModel>()) }
            composable("tasks") { TasksScreen(viewModel<TasksViewModel>()) }
            composable("leads") { LeadsScreen(viewModel<LeadsViewModel>()) }
            composable("reports") { SiteReportsScreen(viewModel<SiteReportsViewModel>()) }
            composable("account") { AccountScreen(viewModel<AccountViewModel>()) }
        }
    }
}
