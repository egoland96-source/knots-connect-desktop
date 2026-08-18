package com.knots.mobile.ui.navigation

import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import com.knots.mobile.R

sealed class BottomNavItem(val screen: Screen, val icon: Int, val label: String) {
    data object Dashboard : BottomNavItem(Screen.Dashboard, R.drawable.ic_dashboard, "Dashboard")
    data object Settings : BottomNavItem(Screen.Settings, R.drawable.ic_settings, "Settings")
}
