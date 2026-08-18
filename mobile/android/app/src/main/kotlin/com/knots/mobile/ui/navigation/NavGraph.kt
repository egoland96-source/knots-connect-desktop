package com.knots.mobile.ui.navigation

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.knots.mobile.ui.dashboard.DashboardScreen
import com.knots.mobile.ui.settings.SettingsScreen
import com.knots.mobile.ui.theme.KnotsThemeColors
import com.knots.mobile.ui.theme.KnotsMotion

@Composable
fun AppNavHost(
    navController: NavHostController = rememberNavController(),
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier.fillMaxSize(),
    ) {
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(bottom = 80.dp),
        ) {
            composable(Screen.Dashboard.route) {
                DashboardScreen(viewModel = viewModel())
            }
            composable(Screen.Settings.route) {
                SettingsScreen(viewModel = viewModel())
            }
        }

        BottomNavBar(
            navController = navController,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
fun BottomNavBar(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    val items = listOf(BottomNavItem.Dashboard, BottomNavItem.Settings)
    val currentRoute = navController.currentBackStackEntry?.destination?.route

    val backgroundBrush = Brush.horizontalGradient(
        colors = listOf(
            KnotsThemeColors.glassCardBg.copy(alpha = 0.85f),
            KnotsThemeColors.glassCardBg.copy(alpha = 0.55f),
            KnotsThemeColors.glassCardBg.copy(alpha = 0.85f),
        )
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Row(
            modifier = Modifier
                .navigationBarsPadding()
                .height(60.dp)
                .clip(RoundedCornerShape(18.dp))
                .background(backgroundBrush)
                .border(
                    width = 1.dp,
                    color = KnotsThemeColors.glassBorder,
                    shape = RoundedCornerShape(18.dp),
                )
                .padding(horizontal = 10.dp, vertical = 6.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            items.forEach { item ->
                val selected = item.screen.route == currentRoute
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    BottomNavItemContent(
                        icon = painterResource(id = item.icon),
                        label = item.label,
                        selected = selected,
                        onClick = {
                            navController.navigate(item.screen.route) {
                                popUpTo(navController.graph.startDestinationId) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun BottomNavItemContent(
    icon: Painter,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val accentAlpha by animateFloatAsState(
        targetValue = if (selected) 0.25f else 0f,
        animationSpec = tween(durationMillis = KnotsMotion.duration300),
    )

    val textColor by animateFloatAsState(
        targetValue = if (selected) 1f else 0.5f,
        animationSpec = tween(durationMillis = KnotsMotion.duration200),
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .clip(RoundedCornerShape(12.dp))
            .background(
                brush = Brush.radialGradient(
                    colors = listOf(
                        KnotsThemeColors.connectedGlow.copy(alpha = accentAlpha),
                        Color.Transparent,
                    )
                )
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Icon(
                painter = icon,
                contentDescription = label,
                tint = if (selected) KnotsThemeColors.connectedGlow else KnotsThemeColors.textMuted.copy(alpha = 0.6f),
                modifier = Modifier.size(20.dp),
            )
            Text(
                text = label,
                fontSize = 11.sp,
                fontWeight = if (selected) FontWeight.W700 else FontWeight.W500,
                color = KnotsThemeColors.textPrimary.copy(alpha = textColor),
            )
        }
    }
}
