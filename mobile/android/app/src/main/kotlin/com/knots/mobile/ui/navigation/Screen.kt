package com.knots.mobile.ui.navigation

sealed class Screen(val route: String, val title: String) {
    data object Dashboard : Screen("dashboard", "Dashboard")
    data object Settings : Screen("settings", "Settings")
}
