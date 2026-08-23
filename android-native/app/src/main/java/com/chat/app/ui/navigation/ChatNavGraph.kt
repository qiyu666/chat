package com.chat.app.ui.navigation

import android.app.Application
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.chat.app.chatContainer
import com.chat.app.ui.auth.AuthScreen
import com.chat.app.ui.auth.AuthViewModel
import com.chat.app.ui.home.HomeScaffold

sealed class Route(val path: String) {
    data object Auth : Route("auth")
    data object Home : Route("home")
}

@Composable
fun ChatNavGraph() {
    val navController = rememberNavController()
    val application = LocalContext.current.applicationContext as Application
    val container = application.chatContainer
    var startDestination by remember { mutableStateOf<String?>(null) }
    val token by container.tokenFlow.collectAsStateWithLifecycle(initialValue = null)
    val authViewModel: AuthViewModel = viewModel()

    startDestination = if (token.isNullOrBlank()) Route.Auth.path else Route.Home.path

    NavHost(navController = navController, startDestination = startDestination!!) {
        composable(Route.Auth.path) {
            AuthScreen(
                viewModel = authViewModel,
                onLoginSuccess = {
                    navController.navigate(Route.Home.path) {
                        popUpTo(Route.Auth.path) { inclusive = true }
                    }
                }
            )
        }
        composable(Route.Home.path) {
            HomeScaffold(
                onLogout = {
                    authViewModel.logout()
                    navController.navigate(Route.Auth.path) {
                        popUpTo(Route.Home.path) { inclusive = true }
                    }
                }
            )
        }
    }
}
